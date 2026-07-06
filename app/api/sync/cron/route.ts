import { NextResponse } from "next/server";

import { loadEnv } from "@/lib/env";
import { getDb } from "@/lib/db";
import { syncLogs } from "@/lib/db/schema";
import { syncAllEnabledSources } from "@/lib/sync/engine";
import { triggerPostSyncAlerts } from "@/lib/alerts/engine";
import { isEmailConfigured } from "@/lib/email/config";

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

    const results = await syncAllEnabledSources("cron");

    await db.insert(syncLogs).values(
      results.map((result) => ({
        sourceId: result.sourceId,
        triggeredBy: "cron",
        status: result.errors.length ? "partial" : "success",
        tenderCount: result.inserted + result.updated,
        errorMessage: result.errors.length ? result.errors.join("; ") : null,
      })),
    );

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
      results,
      alerts,
      syncedAt: new Date().toISOString(),
      hint: "Point n8n Schedule Trigger to POST /api/sync/cron with Authorization: Bearer SYNC_CRON_SECRET, then POST /api/alerts/cron for daily digests",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Cron sync failed" },
      { status: 500 },
    );
  }
}
