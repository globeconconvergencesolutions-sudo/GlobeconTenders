import { eq } from "drizzle-orm";
import type { NextRequest } from "next/server";

import { resolveSessionTokenFromHeaders } from "@/lib/auth/session-token";
import { getDb } from "@/lib/db";
import { baSession, baUser } from "@/lib/db/schema";
import type { UserRole } from "@/lib/db/schema";
import { canAccessPlatformAdmin } from "@/lib/platform/access";

export type MiddlewareSessionUser = {
  id: string;
  email?: string;
  name?: string;
  role: UserRole;
  orgId: number;
  orgSlug: string;
  isPlatformAdmin: boolean;
};

/**
 * Edge-safe session read: cookie token → ba_session row.
 * After logout the row is gone, so a sticky cookie cannot keep access.
 */
export async function lookupSessionFromRequest(
  request: NextRequest,
): Promise<MiddlewareSessionUser | null> {
  const token = resolveSessionTokenFromHeaders(request.headers);
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
  };
}
