import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { auth } from "@/auth";
import type { Permission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import {
  orgMemberships,
  organizations,
  users,
  type UserRole,
} from "@/lib/db/schema";
import { canAccessPlatformAdmin } from "@/lib/platform/access";

export type SessionUser = {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  orgId: number;
  orgSlug: string;
  isPlatformAdmin: boolean;
};

async function loadSessionUserFromDb(
  userId: number,
  orgId: number,
): Promise<SessionUser | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isPlatformAdmin: users.isPlatformAdmin,
      userActive: users.isActive,
      orgRole: orgMemberships.role,
      membershipActive: orgMemberships.isActive,
      orgId: orgMemberships.orgId,
      orgSlug: organizations.slug,
    })
    .from(orgMemberships)
    .innerJoin(users, eq(users.id, orgMemberships.userId))
    .innerJoin(organizations, eq(organizations.id, orgMemberships.orgId))
    .where(
      and(
        eq(orgMemberships.userId, userId),
        eq(orgMemberships.orgId, orgId),
      ),
    )
    .limit(1);

  if (!row?.userActive || !row.membershipActive || row.orgId !== orgId) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.orgRole as UserRole,
    orgId: row.orgId,
    orgSlug: row.orgSlug,
    isPlatformAdmin: canAccessPlatformAdmin({
      isPlatformAdmin: row.isPlatformAdmin,
      orgSlug: row.orgSlug,
    }),
  };
}

export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id || !session.user.orgId) return null;

  const userId = Number(session.user.id);
  const orgId = Number(session.user.orgId);

  // Membership is source of truth. Inactive / missing membership = signed out.
  // Do not fall back to the cookie snapshot — that would keep demoted or
  // deactivated users in the app until they log out.
  return loadSessionUserFromDb(userId, orgId);
});

export async function requireSessionUser() {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHORIZED");
  }
  return user;
}

export async function requirePermission(permission: Permission) {
  const user = await requireSessionUser();
  if (!hasPermission(user.role, permission)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}

export async function requirePlatformAdmin() {
  const user = await requireSessionUser();
  if (!canAccessPlatformAdmin(user)) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
