import { headers } from "next/headers";
import { eq } from "drizzle-orm";

import { auth as betterAuth } from "@/lib/auth/better-auth";
import { getAuthDb } from "@/lib/db/auth-db";
import { baSession } from "@/lib/db/schema";
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
 * App-wide session reader (replaces Auth.js `auth()`).
 * Workspace fields live on ba_session (set at login).
 */
export async function auth(): Promise<AppSession | null> {
  const session = await betterAuth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user || !session.session) return null;

  const orgId = Number(
    (session.session as { orgId?: number | null }).orgId ?? 0,
  );
  const orgSlug =
    ((session.session as { orgSlug?: string | null }).orgSlug as string) ?? "";
  const role = ((session.session as { role?: string | null }).role ??
    "viewer") as UserRole;
  const rawPlatform = Boolean(
    (session.session as { isPlatformAdmin?: boolean | null }).isPlatformAdmin,
  );

  if (!orgId || !orgSlug) return null;

  return {
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role,
      orgId,
      orgSlug,
      isPlatformAdmin: canAccessPlatformAdmin({
        isPlatformAdmin: rawPlatform,
        orgSlug,
      }),
    },
    expires: new Date(session.session.expiresAt).toISOString(),
  };
}

export async function setSessionWorkspaceFields(args: {
  sessionToken: string;
  orgId: number;
  orgSlug: string;
  role: UserRole;
  isPlatformAdmin: boolean;
}): Promise<void> {
  const db = getAuthDb();
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

export { betterAuth };
