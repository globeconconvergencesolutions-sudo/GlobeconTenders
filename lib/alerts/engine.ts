import {
  getAlertUsers,
  getClosingSoonAlerts,
  getHighMatchAlerts,
  logAlertDeliveries,
  logDigestResult,
  type AlertUser,
} from "@/lib/alerts/queries";
import { getEmailConfig } from "@/lib/email/config";
import { getEmailOrgPresentation } from "@/lib/email/presentation";
import { buildDigestEmail, buildTestEmail } from "@/lib/email/templates";
import { getEmailConnectionStatus, sendEmail } from "@/lib/email/transport";
import { listActiveOrganizations } from "@/lib/tenant/org";

export type UserDigestResult = {
  userId: number;
  email: string;
  orgId: number;
  status: "sent" | "skipped" | "failed";
  closingCount: number;
  highMatchCount: number;
  error?: string;
};

export type BulkDigestResult = {
  ok: boolean;
  configured: boolean;
  processed: number;
  sent: number;
  skipped: number;
  failed: number;
  results: UserDigestResult[];
};

async function sendUserDigest(
  user: AlertUser,
  options: { afterSync?: boolean; orgPresentation?: Awaited<ReturnType<typeof getEmailOrgPresentation>> } = {},
): Promise<UserDigestResult> {
  const config = getEmailConfig();
  if (!config) {
    return {
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      status: "skipped",
      closingCount: 0,
      highMatchCount: 0,
      error: "Gmail not configured",
    };
  }

  if (options.afterSync && !user.notificationPrefs.afterSync) {
    await logDigestResult({
      orgId: user.orgId,
      userId: user.id,
      status: "skipped",
      closingCount: 0,
      highMatchCount: 0,
      errorMessage: "After-sync alerts disabled",
    });
    return {
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      status: "skipped",
      closingCount: 0,
      highMatchCount: 0,
    };
  }

  try {
    const [closingSoon, highMatch] = await Promise.all([
      getClosingSoonAlerts(user),
      getHighMatchAlerts(
        user,
        options.afterSync ? { sinceHours: 24 } : undefined,
      ),
    ]);

    if (closingSoon.length === 0 && highMatch.length === 0) {
      await logDigestResult({
        orgId: user.orgId,
        userId: user.id,
        status: "skipped",
        closingCount: 0,
        highMatchCount: 0,
      });
      return {
        userId: user.id,
        email: user.email,
        orgId: user.orgId,
        status: "skipped",
        closingCount: 0,
        highMatchCount: 0,
      };
    }

    const orgPresentation =
      options.orgPresentation ?? (await getEmailOrgPresentation(user.orgId));

    const message = buildDigestEmail({
      recipientName: user.name,
      closingSoon,
      highMatch,
      closingSoonDays: user.notificationPrefs.closingSoonDays,
      highMatchThreshold: user.notificationPrefs.highMatchThreshold,
      appUrl: config.appUrl,
      org: orgPresentation,
    });

    await sendEmail({
      to: user.email,
      subject: message.subject,
      html: message.html,
      text: message.text,
    });

    await Promise.all([
      logAlertDeliveries(
        user.id,
        "closing_soon",
        closingSoon.map((row) => row.id),
        user.orgId,
      ),
      logAlertDeliveries(
        user.id,
        "high_match",
        highMatch.map((row) => row.id),
        user.orgId,
      ),
      logDigestResult({
        orgId: user.orgId,
        userId: user.id,
        status: "success",
        closingCount: closingSoon.length,
        highMatchCount: highMatch.length,
      }),
    ]);

    return {
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      status: "sent",
      closingCount: closingSoon.length,
      highMatchCount: highMatch.length,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digest failed";
    await logDigestResult({
      orgId: user.orgId,
      userId: user.id,
      status: "failed",
      closingCount: 0,
      highMatchCount: 0,
      errorMessage: message,
    });
    return {
      userId: user.id,
      email: user.email,
      orgId: user.orgId,
      status: "failed",
      closingCount: 0,
      highMatchCount: 0,
      error: message,
    };
  }
}

export async function processAllAlertDigests(
  options: { afterSync?: boolean; orgId?: number } = {},
): Promise<BulkDigestResult> {
  const config = getEmailConfig();
  if (!config) {
    return {
      ok: false,
      configured: false,
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      results: [],
    };
  }

  const orgs =
    options.orgId != null
      ? [{ id: options.orgId }]
      : await listActiveOrganizations();

  const results: UserDigestResult[] = [];

  for (const org of orgs) {
    const orgPresentation = await getEmailOrgPresentation(org.id);
    const users = await getAlertUsers(org.id);
    for (const user of users) {
      results.push(
        await sendUserDigest(user, { ...options, orgPresentation }),
      );
    }
  }

  return {
    ok: results.every((result) => result.status !== "failed"),
    configured: true,
    processed: results.length,
    sent: results.filter((result) => result.status === "sent").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };
}

export async function sendTestAlertEmail(input: {
  email: string;
  name: string;
  orgId?: number;
}) {
  const config = getEmailConfig();
  if (!config) {
    throw new Error("Gmail is not configured");
  }

  const connection = await getEmailConnectionStatus();
  if (!connection.connected) {
    throw new Error(
      connection.error ??
        "Could not connect to Gmail. Check GMAIL_USER and GMAIL_APP_PASSWORD.",
    );
  }

  const orgPresentation = input.orgId
    ? await getEmailOrgPresentation(input.orgId)
    : undefined;
  const message = buildTestEmail(input.name, config.appUrl, orgPresentation);
  await sendEmail({
    to: input.email,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
}

export async function triggerPostSyncAlerts(
  orgId?: number,
): Promise<BulkDigestResult> {
  return processAllAlertDigests({ afterSync: true, orgId });
}
