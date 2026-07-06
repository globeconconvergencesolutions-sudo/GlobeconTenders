import { NextResponse } from "next/server";
import { z } from "zod";

import { canSync } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { syncLogs } from "@/lib/db/schema";
import { syncAllEnabledSources, syncSource } from "@/lib/sync/engine";
import { triggerPostSyncAlerts } from "@/lib/alerts/engine";
import { isEmailConfigured } from "@/lib/email/config";

const syncBodySchema = z.object({
  sourceId: z.number().int().positive().optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canSync(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const { sourceId } = syncBodySchema.parse(rawBody);

    const results = sourceId
      ? [await syncSource(sourceId)]
      : await syncAllEnabledSources("manual");

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
    if (isEmailConfigured()) {
      try {
        alerts = await triggerPostSyncAlerts();
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
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sync failed" },
      { status: 500 },
    );
  }
}
