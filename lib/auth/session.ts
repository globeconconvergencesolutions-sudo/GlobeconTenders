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
    isPlatformAdmin: row.isPlatformAdmin,
  };
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.orgId) return null;

  const userId = Number(session.user.id);
  const orgId = Number(session.user.orgId);

  const dbUser = await loadSessionUserFromDb(userId, orgId);
  if (dbUser) return dbUser;

  if (session.user.role && session.user.email && session.user.orgSlug) {
    return {
      id: userId,
      email: session.user.email,
      name: session.user.name ?? session.user.email,
      role: session.user.role as UserRole,
      orgId,
      orgSlug: session.user.orgSlug,
      isPlatformAdmin: Boolean(session.user.isPlatformAdmin),
    };
  }

  return null;
}

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
  if (!user.isPlatformAdmin) {
    throw new Error("FORBIDDEN");
  }
  return user;
}
