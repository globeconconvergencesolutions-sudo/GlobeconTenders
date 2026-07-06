import { NextResponse } from "next/server";

import { processAllAlertDigests } from "@/lib/alerts/engine";
import { getEmailAlertStatus } from "@/lib/alerts/queries";
import { loadEnv } from "@/lib/env";
import { isEmailConfigured } from "@/lib/email/config";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.SYNC_CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

export async function POST(request: Request) {
  loadEnv();

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Gmail is not configured. Set GMAIL_USER, GMAIL_APP_PASSWORD, and EMAIL_ALERTS_ENABLED=true",
      },
      { status: 503 },
    );
  }

  try {
    const result = await processAllAlertDigests();
    return NextResponse.json({
      ok: result.ok,
      configured: result.configured,
      processed: result.processed,
      sent: result.sent,
      skipped: result.skipped,
      failed: result.failed,
      results: result.results,
      sentAt: new Date().toISOString(),
      hint: "Schedule POST /api/alerts/cron daily (after /api/sync/cron) with Authorization: Bearer SYNC_CRON_SECRET",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Alert cron failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  loadEnv();

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const status = await getEmailAlertStatus();
  return NextResponse.json({
    configured: isEmailConfigured(),
    ...status,
    recentDigests: status.recentDigests.map((row) => ({
      ...row,
      sentAt: row.sentAt.toISOString(),
    })),
  });
}
