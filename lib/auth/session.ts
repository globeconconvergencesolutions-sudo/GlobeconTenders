import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import type { Permission } from "@/lib/auth/permissions";
import { hasPermission } from "@/lib/auth/permissions";
import { getDb } from "@/lib/db";
import { users, type UserRole } from "@/lib/db/schema";

export async function getSessionUser() {
  const session = await auth();
  if (!session?.user?.id || !session.user.role) return null;
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

  const db = getDb();
  if (db) {
    const [row] = await db
      .select({ isActive: users.isActive })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (!row?.isActive) {
      throw new Error("UNAUTHORIZED");
    }
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
