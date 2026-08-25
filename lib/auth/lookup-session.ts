import { eq } from "drizzle-orm";
import { getSessionCookie } from "better-auth/cookies";
import type { NextRequest } from "next/server";

import { getDb } from "@/lib/db";
import { baSession } from "@/lib/db/schema";
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
  const token = getSessionCookie(request);
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
    })
    .from(baSession)
    .where(eq(baSession.token, token))
    .limit(1);

  if (!row || row.expiresAt < new Date()) return null;
  if (!row.orgId || !row.orgSlug || !row.role) return null;

  return {
    id: row.userId,
    role: row.role as UserRole,
    orgId: row.orgId,
    orgSlug: row.orgSlug,
    isPlatformAdmin: canAccessPlatformAdmin({
      isPlatformAdmin: Boolean(row.isPlatformAdmin),
      orgSlug: row.orgSlug,
    }),
  };
}
