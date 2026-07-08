import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import type { Permission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { users, type UserRole } from "@/lib/db/schema";

async function loadUserFromDb(userId: number) {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!row?.isActive) return null;

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role as UserRole,
  };
}

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const dbUser = await loadUserFromDb(Number(session.user.id));
  if (dbUser) return dbUser;

  if (!session.user.role) return null;

  return {
    id: Number(session.user.id),
    email: session.user.email!,
    name: session.user.name ?? session.user.email!,
    role: session.user.role as UserRole,
  };
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
