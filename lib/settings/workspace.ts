import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  DEFAULT_WORKSPACE_SETTINGS,
  type DelegatableSettingsPermission,
  type WorkspaceNotificationSettings,
  type WorkspaceSettingsPayload,
  userPermissionGrants,
  users,
  workspaceSettings,
} from "@/lib/db/schema";

function normalizeNotifications(
  value: WorkspaceNotificationSettings | null | undefined,
): WorkspaceNotificationSettings {
  if (!value) return DEFAULT_WORKSPACE_SETTINGS.notifications;
  return {
    enabled: value.enabled !== false,
    mode: "explicit_list",
    includedUserIds: Array.isArray(value.includedUserIds)
      ? value.includedUserIds.filter((id) => Number.isFinite(id))
      : [],
    respectUserOptOut: value.respectUserOptOut !== false,
    defaultPrefs: {
      ...DEFAULT_WORKSPACE_SETTINGS.notifications.defaultPrefs,
      ...value.defaultPrefs,
    },
  };
}

async function ensureDefaultAlertRecipients(
  settings: WorkspaceSettingsPayload,
): Promise<WorkspaceSettingsPayload> {
  const db = getDb();
  if (!db || settings.notifications.includedUserIds.length > 0) {
    return settings;
  }

  const superAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "super_admin"), eq(users.isActive, true)));

  if (superAdmins.length === 0) return settings;

  const includedUserIds = superAdmins.map((row) => row.id);
  const notifications = {
    ...settings.notifications,
    includedUserIds,
  };

  await db
    .insert(workspaceSettings)
    .values({
      id: 1,
      notifications,
      updatedById: superAdmins[0].id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceSettings.id,
      set: {
        notifications,
        updatedById: superAdmins[0].id,
        updatedAt: new Date(),
      },
    });

  return { ...settings, notifications };
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsPayload> {
  const db = getDb();
  if (!db) return DEFAULT_WORKSPACE_SETTINGS;

  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.id, 1))
    .limit(1);

  if (!row) {
    await db.insert(workspaceSettings).values({ id: 1 }).onConflictDoNothing();
    return ensureDefaultAlertRecipients(DEFAULT_WORKSPACE_SETTINGS);
  }

  const settings = {
    organizationName: row.organizationName,
    notifications: normalizeNotifications(row.notifications),
    branding: row.branding ?? {},
    catalog: row.catalog ?? DEFAULT_WORKSPACE_SETTINGS.catalog,
  };

  return ensureDefaultAlertRecipients(settings);
}

export async function updateWorkspaceNotifications(
  notifications: WorkspaceNotificationSettings,
  updatedById: number,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const normalized = normalizeNotifications(notifications);

  await db
    .insert(workspaceSettings)
    .values({
      id: 1,
      notifications: normalized,
      updatedById,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceSettings.id,
      set: {
        notifications: normalized,
        updatedById,
        updatedAt: new Date(),
      },
    });

  return normalized;
}

export async function getUserGrants(userId: number) {
  const db = getDb();
  if (!db) return [];

  return db
    .select({
      id: userPermissionGrants.id,
      permission: userPermissionGrants.permission,
      grantedById: userPermissionGrants.grantedById,
      createdAt: userPermissionGrants.createdAt,
    })
    .from(userPermissionGrants)
    .where(eq(userPermissionGrants.userId, userId));
}

export async function userHasGrant(
  userId: number,
  permission: DelegatableSettingsPermission,
) {
  const grants = await getUserGrants(userId);
  return grants.some((grant) => grant.permission === permission);
}

export async function listNotificationDelegates() {
  const db = getDb();
  if (!db) return [];

  return db
    .select({
      id: userPermissionGrants.id,
      userId: userPermissionGrants.userId,
      permission: userPermissionGrants.permission,
      grantedById: userPermissionGrants.grantedById,
      createdAt: userPermissionGrants.createdAt,
      userName: users.name,
      userEmail: users.email,
      userRole: users.role,
      isActive: users.isActive,
    })
    .from(userPermissionGrants)
    .innerJoin(users, eq(userPermissionGrants.userId, users.id))
    .where(eq(userPermissionGrants.permission, "settings:notifications"));
}

export async function grantUserPermission(input: {
  userId: number;
  permission: DelegatableSettingsPermission;
  grantedById: number;
}) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [grant] = await db
    .insert(userPermissionGrants)
    .values({
      userId: input.userId,
      permission: input.permission,
      grantedById: input.grantedById,
    })
    .onConflictDoNothing()
    .returning();

  return grant ?? null;
}

export async function revokeUserPermission(grantId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  await db
    .delete(userPermissionGrants)
    .where(eq(userPermissionGrants.id, grantId));
}

export function isUserIncludedInAlerts(
  userId: number,
  notifications: WorkspaceNotificationSettings,
) {
  return notifications.includedUserIds.includes(userId);
}
