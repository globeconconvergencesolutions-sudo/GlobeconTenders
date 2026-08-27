import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { baSession, orgMemberships, users, type UserRole } from "@/lib/db/schema";
import { bumpUserSessionVersion } from "@/lib/auth/session-version";

export type WorkspaceMemberRow = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
};

export async function getWorkspaceMember(
  orgId: number,
  userId: number,
): Promise<WorkspaceMemberRow | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: orgMemberships.role,
      isActive: orgMemberships.isActive,
      createdAt: users.createdAt,
    })
    .from(orgMemberships)
    .innerJoin(users, eq(users.id, orgMemberships.userId))
    .where(
      and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.userId, userId)),
    )
    .limit(1);

  if (!row) return null;
  return {
    ...row,
    role: row.role as UserRole,
  };
}

export async function revokeUserSessions(userId: number): Promise<void> {
  await bumpUserSessionVersion(userId);
  const db = getDb();
  if (!db) return;
  await db.delete(baSession).where(eq(baSession.userId, String(userId)));
}

export async function syncBaSessionRole(
  userId: number,
  role: UserRole,
): Promise<void> {
  const db = getDb();
  if (!db) return;
  await db
    .update(baSession)
    .set({ role, updatedAt: new Date() })
    .where(eq(baSession.userId, String(userId)));
}

/**
 * Keep users.*, org_memberships, and live ba_session rows in lockstep.
 * Session + Team list always read membership; login also checks users.isActive.
 */
export async function persistWorkspaceMemberAccess(input: {
  orgId: number;
  userId: number;
  name?: string;
  role?: UserRole;
  isActive?: boolean;
  passwordHash?: string;
}): Promise<WorkspaceMemberRow | null> {
  const db = getDb();
  if (!db) return null;

  const current = await getWorkspaceMember(input.orgId, input.userId);
  if (!current) return null;

  const nextRole = input.role ?? current.role;
  const nextActive =
    typeof input.isActive === "boolean" ? input.isActive : current.isActive;

  const userUpdates: Partial<{
    name: string;
    role: UserRole;
    isActive: boolean;
    passwordHash: string;
    updatedAt: Date;
  }> = { updatedAt: new Date() };

  if (input.name) userUpdates.name = input.name;
  if (input.role) userUpdates.role = input.role;
  if (typeof input.isActive === "boolean") userUpdates.isActive = input.isActive;
  if (input.passwordHash) userUpdates.passwordHash = input.passwordHash;

  await db.update(users).set(userUpdates).where(eq(users.id, input.userId));

  const membershipUpdates: Partial<{
    role: UserRole;
    isActive: boolean;
  }> = {};
  if (input.role) membershipUpdates.role = input.role;
  if (typeof input.isActive === "boolean") {
    membershipUpdates.isActive = input.isActive;
  }

  if (Object.keys(membershipUpdates).length > 0) {
    await db
      .update(orgMemberships)
      .set(membershipUpdates)
      .where(
        and(
          eq(orgMemberships.orgId, input.orgId),
          eq(orgMemberships.userId, input.userId),
        ),
      );
  }

  if (nextActive === false) {
    await revokeUserSessions(input.userId);
  } else if (input.role && input.role !== current.role) {
    await syncBaSessionRole(input.userId, nextRole);
  }

  return getWorkspaceMember(input.orgId, input.userId);
}
