import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";

import { triggerPostSyncAlerts } from "@/lib/alerts/engine";
import { getDb } from "@/lib/db";
import { sources, syncLogs } from "@/lib/db/schema";
import { isEmailConfigured } from "@/lib/email/config";
import { loadEnv } from "@/lib/env";
import {
  getOrganizationPlanSnapshot,
  sourceDueForSync,
} from "@/lib/platform/limits";
import { orgAllowsSync } from "@/lib/platform/org-status";
import { expireTrials } from "@/lib/platform/trials";
import { syncSource } from "@/lib/sync/engine";
import { listActiveOrganizations } from "@/lib/tenant/org";

export async function POST(request: Request) {
  loadEnv();
  const cronSecret = process.env.SYNC_CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const trialResult = await expireTrials();
    const orgs = await listActiveOrganizations();
    const allResults: Awaited<ReturnType<typeof syncSource>>[] = [];
    const skippedOrgs: Array<{ orgId: number; reason: string }> = [];

    for (const org of orgs) {
      const snapshot = await getOrganizationPlanSnapshot(org.id);
      if (!snapshot || !orgAllowsSync(snapshot.status)) {
        skippedOrgs.push({
          orgId: org.id,
          reason: snapshot?.status ?? "missing",
        });
        continue;
      }

      const enabledSources = await db
        .select()
        .from(sources)
        .where(
          and(
            eq(sources.orgId, org.id),
            eq(sources.enabled, true),
            isNull(sources.archivedAt),
          ),
        );

      const dueSources = enabledSources.filter((source) =>
        sourceDueForSync(source.lastSyncedAt, snapshot.syncIntervalHours),
      );

      if (dueSources.length === 0) {
        skippedOrgs.push({ orgId: org.id, reason: "sync_interval" });
        continue;
      }

      const orgResults: Awaited<ReturnType<typeof syncSource>>[] = [];

      for (const source of dueSources) {
        try {
          orgResults.push(await syncSource(source.id));
        } catch (error) {
          orgResults.push({
            sourceId: source.id,
            sourceName: source.name,
            inserted: 0,
            updated: 0,
            errors: [
              error instanceof Error ? error.message : "Cron sync failed",
            ],
          });
        }
      }

      allResults.push(...orgResults);

      await db.insert(syncLogs).values(
        orgResults.map((result) => ({
          orgId: org.id,
          sourceId: result.sourceId,
          triggeredBy: "cron",
          status: result.errors.length ? "partial" : "success",
          tenderCount: result.inserted + result.updated,
          errorMessage: result.errors.length ? result.errors.join("; ") : null,
        })),
      );
    }

    let alerts: Awaited<ReturnType<typeof triggerPostSyncAlerts>> | null = null;
    if (isEmailConfigured()) {
      try {
        alerts = await triggerPostSyncAlerts();
      } catch {
        alerts = null;
      }
    }

    return NextResponse.json({
      ok: true,
      orgCount: orgs.length,
      trialExpiry: trialResult,
      skippedOrgs,
      results: allResults,
      alerts,
      syncedAt: new Date().toISOString(),
      hint: "Cron sync runs per active organization on GlobeTender Cloud",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron sync failed" },
      { status: 500 },
    );
  }
}
