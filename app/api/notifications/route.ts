import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getRecentDigestLogs,
  getUserNotificationPrefs,
  updateUserNotificationPrefs,
} from "@/lib/alerts/queries";
import { requireSessionUser } from "@/lib/auth/session";
import { isEmailConfigured, isTransactionalEmailConfigured } from "@/lib/email/config";
import {
  getEmailConnectionStatus,
  maskEmailAddress,
} from "@/lib/email/transport";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/db/schema";
import {
  getWorkspaceSettings,
  isUserIncludedInAlerts,
} from "@/lib/settings/workspace";

const prefsSchema = z.object({
  enabled: z.boolean(),
  closingSoon: z.boolean(),
  closingSoonDays: z.number().int().min(1).max(14),
  highMatch: z.boolean(),
  highMatchThreshold: z.number().int().min(10).max(100),
  afterSync: z.boolean(),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    const [prefs, recentDigests, emailStatus, workspace] = await Promise.all([
      getUserNotificationPrefs(user.id),
      getRecentDigestLogs(user.id),
      getEmailConnectionStatus(),
      getWorkspaceSettings(),
    ]);

    const orgIncluded = isUserIncludedInAlerts(
      user.id,
      workspace.notifications,
    );
    const workspaceAlertsEnabled = workspace.notifications.enabled;

    return NextResponse.json({
      prefs,
      emailConfigured: isEmailConfigured(),
      smtpConfigured: isTransactionalEmailConfigured(),
      alertsEnabled: emailStatus.alertsEnabled,
      emailConnected: emailStatus.connected,
      emailFrom: emailStatus.fromAddress
        ? maskEmailAddress(emailStatus.fromAddress)
        : null,
      emailFromName: emailStatus.fromName ?? null,
      emailError: emailStatus.error ?? null,
      recentDigests: recentDigests.map((row) => ({
        ...row,
        sentAt: row.sentAt.toISOString(),
      })),
      defaults: DEFAULT_NOTIFICATION_PREFS,
      workspaceAlertsEnabled,
      orgIncluded,
      explicitListOnly: true,
      receivesAlerts:
        workspaceAlertsEnabled &&
        orgIncluded &&
        workspace.notifications.respectUserOptOut &&
        prefs.enabled,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    const prefs = prefsSchema.parse(await request.json());
    await updateUserNotificationPrefs(user.id, prefs);
    return NextResponse.json({ prefs });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    );
  }
}
