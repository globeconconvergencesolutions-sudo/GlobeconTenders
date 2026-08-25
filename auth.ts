import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { resolveSessionTokenFromHeaders } from "@/lib/auth/session-token";
import { getAuthDb } from "@/lib/db/auth-db";
import { getDb } from "@/lib/db";
import { baSession, baUser } from "@/lib/db/schema";
import type { UserRole } from "@/lib/db/schema";
import { canAccessPlatformAdmin } from "@/lib/platform/access";

export type AppSessionUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  orgId: number;
  orgSlug: string;
  isPlatformAdmin: boolean;
  sessionVersion?: number;
};

export type AppSession = {
  user: AppSessionUser;
  expires: string;
};

/**
 * App-wide session reader.
 *
 * Reads the Better Auth cookie, strips the signature, then loads workspace
 * fields from `ba_session` (same source of truth as middleware). This avoids
 * `betterAuth.api.getSession()` failing when cookies are unsigned/mismatched
 * while still requiring org fields set at login.
 */
export async function auth(): Promise<AppSession | null> {
  const headerStore = await headers();
  const token = resolveSessionTokenFromHeaders(headerStore);
  if (!token) return null;

  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      userId: baSession.userId,
      expiresAt: baSession.expiresAt,
      orgId: baSession.orgId,
      orgSlug: baSession.orgSlug,
      role: baSession.role,
      isPlatformAdmin: baSession.isPlatformAdmin,
      email: baUser.email,
      name: baUser.name,
    })
    .from(baSession)
    .innerJoin(baUser, eq(baUser.id, baSession.userId))
    .where(eq(baSession.token, token))
    .limit(1);

  if (!row || row.expiresAt < new Date()) return null;
  if (!row.orgId || !row.orgSlug || !row.role) return null;

  return {
    user: {
      id: row.userId,
      email: row.email,
      name: row.name,
      role: row.role as UserRole,
      orgId: row.orgId,
      orgSlug: row.orgSlug,
      isPlatformAdmin: canAccessPlatformAdmin({
        isPlatformAdmin: Boolean(row.isPlatformAdmin),
        orgSlug: row.orgSlug,
      }),
    },
    expires: row.expiresAt.toISOString(),
  };
}

export async function setSessionWorkspaceFields(args: {
  sessionToken: string;
  orgId: number;
  orgSlug: string;
  role: UserRole;
  isPlatformAdmin: boolean;
}): Promise<void> {
  const db = getAuthDb() ?? getDb();
  if (!db) return;

  await db
    .update(baSession)
    .set({
      orgId: args.orgId,
      orgSlug: args.orgSlug,
      role: args.role,
      isPlatformAdmin: args.isPlatformAdmin,
      updatedAt: new Date(),
    })
    .where(eq(baSession.token, args.sessionToken));
}
