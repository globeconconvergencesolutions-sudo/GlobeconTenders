import { NextResponse } from "next/server";
import { z } from "zod";

import { canSync } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { syncLogs } from "@/lib/db/schema";
import { syncAllEnabledSources, syncSource } from "@/lib/sync/engine";
import { triggerPostSyncAlerts } from "@/lib/alerts/engine";
import { isEmailConfigured } from "@/lib/email/config";
import { requireOrgFeature } from "@/lib/tenant/features";
import { handleApiError } from "@/lib/api/errors";
import { assertCanSync } from "@/lib/platform/limits";
import { reconcileTenderListings } from "@/lib/tenders/lifecycle";
import { and, asc, eq, isNull } from "drizzle-orm";
import { sources } from "@/lib/db/schema";

const syncBodySchema = z.object({
  sourceId: z.number().int().positive().optional(),
  list: z.boolean().optional(),
  notify: z.boolean().optional(),
});

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canSync(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await requireOrgFeature("sync");
    await assertCanSync(user.orgId);

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const { sourceId, list, notify } = syncBodySchema.parse(rawBody);

    if (list) {
      const rows = await db
        .select({ id: sources.id, name: sources.name })
        .from(sources)
        .where(
          and(
            eq(sources.orgId, user.orgId),
            eq(sources.enabled, true),
            isNull(sources.archivedAt),
          ),
        )
        .orderBy(asc(sources.id));
      return NextResponse.json({ sources: rows });
    }

    if (sourceId) {
      const [owned] = await db
        .select({ id: sources.id, name: sources.name })
        .from(sources)
        .where(and(eq(sources.id, sourceId), eq(sources.orgId, user.orgId)))
        .limit(1);
      if (!owned) {
        return NextResponse.json({ error: "Source not found" }, { status: 404 });
      }
    }

    let results;
    if (sourceId) {
      try {
        results = [await syncSource(sourceId)];
      } catch (error) {
        const message = error instanceof Error ? error.message : "Sync failed unexpectedly";
        await db
          .update(sources)
          .set({
            lastSyncStatus: "partial",
            lastSyncError: message.slice(0, 280),
          })
          .where(and(eq(sources.id, sourceId), eq(sources.orgId, user.orgId)));
        const [named] = await db
          .select({ name: sources.name })
          .from(sources)
          .where(eq(sources.id, sourceId))
          .limit(1);
        results = [
          {
            sourceId,
            sourceName: named?.name ?? "Source",
            inserted: 0,
            updated: 0,
            unchanged: 0,
            irrelevant: 0,
            errors: [message],
          },
        ];
      }
      await reconcileTenderListings(user.orgId);
    } else {
      results = await syncAllEnabledSources("manual", user.orgId);
    }

    await db.insert(syncLogs).values(
      results.map((result) => ({
        sourceId: result.sourceId,
        triggeredBy: sourceId
          ? `manual:${user.email}:source:${sourceId}`
          : `manual:${user.email}`,
        status: result.errors.length ? "partial" : "success",
        tenderCount: result.inserted + result.updated,
        errorMessage: result.errors.length ? result.errors.join("; ") : null,
      })),
    );

    let alerts: Awaited<ReturnType<typeof triggerPostSyncAlerts>> | null = null;
    if (isEmailConfigured() && (sourceId ? notify === true : notify !== false)) {
      try {
        alerts = await triggerPostSyncAlerts(user.orgId);
      } catch {
        alerts = null;
      }
    }

    return NextResponse.json({
      results,
      syncedAt: new Date().toISOString(),
      alerts,
    });
  } catch (error) {
    return handleApiError(error, "Sync failed");
  }
}
