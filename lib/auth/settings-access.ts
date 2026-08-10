import { hasPermission } from "@/lib/auth/permissions";
import type { DelegatableSettingsPermission, UserRole } from "@/lib/db/schema";
import {
  getUserGrants,
  userHasGrant,
} from "@/lib/settings/workspace";

export {
  isDelegatablePermission,
  SETTINGS_PERMISSION_LABELS,
} from "@/lib/auth/settings-labels";

export async function getSettingsAccessForUser(input: {
  userId: number;
  role: UserRole;
}) {
  const grants = await getUserGrants(input.userId);
  const grantPermissions = grants.map((g) => g.permission);

  const canManageSettings = hasPermission(input.role, "settings:manage");
  const canManageNotifications =
    canManageSettings ||
    grantPermissions.includes("settings:notifications") ||
    (await userHasGrant(input.userId, "settings:notifications"));

  const canAccessSettings = canManageSettings || canManageNotifications;

  return {
    canAccessSettings,
    canManageSettings,
    canManageNotifications,
    canManageDelegations: canManageSettings,
    grants: grantPermissions,
  };
}

export async function requireSettingsAccess(userId: number, role: UserRole) {
  const access = await getSettingsAccessForUser({ userId, role });
  if (!access.canAccessSettings) {
    throw new Error("FORBIDDEN");
  }
  return access;
}

export async function requireNotificationSettingsAccess(
  userId: number,
  role: UserRole,
) {
  const access = await getSettingsAccessForUser({ userId, role });
  if (!access.canManageNotifications) {
    throw new Error("FORBIDDEN");
  }
  return access;
}

export async function requireSettingsManage(userId: number, role: UserRole) {
  const access = await getSettingsAccessForUser({ userId, role });
  if (!access.canManageSettings) {
    throw new Error("FORBIDDEN");
  }
  return access;
}

