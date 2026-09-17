import { NextResponse } from "next/server";

import { triggerManualAlertSend } from "@/lib/alerts/engine";
import { requireSessionUser } from "@/lib/auth/session";
import { isEmailConfigured } from "@/lib/email/config";
import { getEmailConnectionStatus } from "@/lib/email/transport";

let manualSendInProgress = false;

export async function POST() {
  try {
    const user = await requireSessionUser();
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (manualSendInProgress) {
      return NextResponse.json(
        { error: "A manual tender email send is already in progress" },
        { status: 409 },
      );
    }

    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          error:
            "Gmail is not configured or email alerts are disabled. Check the email settings.",
        },
        { status: 503 },
      );
    }

    const connection = await getEmailConnectionStatus();
    if (!connection.connected) {
      return NextResponse.json(
        {
          error:
            connection.error ??
            "Could not connect to Gmail. Check the Gmail app password.",
        },
        { status: 503 },
      );
    }

    manualSendInProgress = true;
    try {
      const result = await triggerManualAlertSend(user.orgId);
      return NextResponse.json({
        ...result,
        sentAt: new Date().toISOString(),
      });
    } finally {
      manualSendInProgress = false;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Manual email send failed",
      },
      { status: 500 },
    );
  }
}