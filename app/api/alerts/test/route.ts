import { NextResponse } from "next/server";

import { sendTestAlertEmail } from "@/lib/alerts/engine";
import { requireSessionUser } from "@/lib/auth/session";
import { isEmailConfigured } from "@/lib/email/config";
import {
  getEmailConnectionStatus,
  maskEmailAddress,
} from "@/lib/email/transport";

export async function POST() {
  try {
    const user = await requireSessionUser();

    if (!isEmailConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          configured: false,
          connected: false,
          error:
            "Gmail is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local",
        },
        { status: 503 },
      );
    }

    const connection = await getEmailConnectionStatus();
    if (!connection.connected) {
      return NextResponse.json(
        {
          ok: false,
          configured: true,
          connected: false,
          error:
            connection.error ??
            "Could not connect to Gmail. Check your app password.",
        },
        { status: 503 },
      );
    }

    await sendTestAlertEmail({
      email: user.email,
      name: user.name,
      orgId: user.orgId,
    });

    return NextResponse.json({
      ok: true,
      configured: true,
      connected: true,
      sent: true,
      to: maskEmailAddress(user.email),
      from: connection.fromAddress
        ? maskEmailAddress(connection.fromAddress)
        : undefined,
      message: `Test email sent to ${maskEmailAddress(user.email)}`,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      {
        ok: false,
        sent: false,
        error: error instanceof Error ? error.message : "Test email failed",
      },
      { status: 500 },
    );
  }
}
