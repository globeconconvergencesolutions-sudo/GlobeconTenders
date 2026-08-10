import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import {
  emailDigestLog,
  orgMemberships,
  users,
  type NotificationPrefs,
  type UserRole,
} from "@/lib/db/schema";
import {
  getWorkspaceSettings,
  isUserIncludedInAlerts,
} from "@/lib/settings/workspace";
import { requireCurrentOrg } from "@/lib/tenant/context";

export type AlertRecipientRow = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  orgIncluded: boolean;
  personalAlertsEnabled: boolean;
  receivesAlerts: boolean;
  notificationPrefs: NotificationPrefs;
  lastDigest: {
    status: string;
    sentAt: string;
    closingCount: number;
    highMatchCount: number;
    errorMessage: string | null;
  } | null;
};

export async function listAlertRecipients(orgId?: number): Promise<{
  recipients: AlertRecipientRow[];
  workspaceEnabled: boolean;
  includedCount: number;
}> {
  const db = getDb();
  const resolvedOrgId = orgId ?? (await requireCurrentOrg()).id;
  const workspace = await getWorkspaceSettings(resolvedOrgId);

  if (!db) {
    return { recipients: [], workspaceEnabled: false, includedCount: 0 };
  }

  const team = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: orgMemberships.role,
      isActive: orgMemberships.isActive,
      notificationPrefs: users.notificationPrefs,
    })
    .from(orgMemberships)
    .innerJoin(users, eq(users.id, orgMemberships.userId))
    .where(eq(orgMemberships.orgId, resolvedOrgId))
    .orderBy(users.name);

  const activeIds = team.filter((u) => u.isActive).map((u) => u.id);
  const recentLogs =
    activeIds.length > 0
      ? await db
          .select()
          .from(emailDigestLog)
          .where(
            and(
              eq(emailDigestLog.orgId, resolvedOrgId),
              inArray(emailDigestLog.userId, activeIds),
            ),
          )
          .orderBy(desc(emailDigestLog.sentAt))
      : [];

  const lastByUser = new Map<number, (typeof recentLogs)[number]>();
  for (const log of recentLogs) {
    if (log.userId == null) continue;
    if (!lastByUser.has(log.userId)) {
      lastByUser.set(log.userId, log);
    }
  }

  const recipients = team.map((user) => {
    const prefs = user.notificationPrefs ?? {
      enabled: true,
      closingSoon: true,
      closingSoonDays: 3,
      highMatch: true,
      highMatchThreshold: 30,
      afterSync: true,
    };
    const orgIncluded =
      user.isActive && isUserIncludedInAlerts(user.id, workspace.notifications);
    const personalAlertsEnabled = prefs.enabled !== false;
    const receivesAlerts =
      workspace.notifications.enabled &&
      orgIncluded &&
      (workspace.notifications.respectUserOptOut ? personalAlertsEnabled : true);

    const last = lastByUser.get(user.id);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as UserRole,
      isActive: user.isActive,
      orgIncluded,
      personalAlertsEnabled,
      receivesAlerts,
      notificationPrefs: prefs,
      lastDigest: last
        ? {
            status: last.status,
            sentAt: last.sentAt.toISOString(),
            closingCount: last.closingCount,
            highMatchCount: last.highMatchCount,
            errorMessage: last.errorMessage,
          }
        : null,
    };
  });

  return {
    recipients,
    workspaceEnabled: workspace.notifications.enabled,
    includedCount: workspace.notifications.includedUserIds.length,
  };
}

export { ROLE_LABELS };
