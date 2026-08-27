import { and, eq } from "drizzle-orm";

import {
  canAccessSettingsHub,
  canAccessTeamPage,
} from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { userPermissionGrants, type UserRole } from "@/lib/db/schema";

/** Paths that require Team (Admin+) — middleware + pages stay aligned. */
export function isTeamManagementPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function canAccessTeamManagementPath(role: UserRole): boolean {
  return canAccessTeamPage(role);
}

/** Workspace settings hub — Super Admin by role, or a notification delegate. */
export function isSettingsPath(pathname: string): boolean {
  return pathname === "/settings" || pathname.startsWith("/settings/");
}

export async function canAccessSettingsPath(input: {
  role: UserRole;
  userId: number;
  orgId: number;
}): Promise<boolean> {
  if (canAccessSettingsHub(input.role)) return true;
  if (!Number.isFinite(input.userId) || !Number.isFinite(input.orgId)) {
    return false;
  }

  const db = getDb();
  if (!db) return false;

  const [grant] = await db
    .select({ id: userPermissionGrants.id })
    .from(userPermissionGrants)
    .where(
      and(
        eq(userPermissionGrants.orgId, input.orgId),
        eq(userPermissionGrants.userId, input.userId),
        eq(userPermissionGrants.permission, "settings:notifications"),
      ),
    )
    .limit(1);

  return Boolean(grant);
}
