import type { AppSession } from "@/auth";

import { hasPermission } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/db/schema";
import { canAccessPlatformAdmin } from "@/lib/platform/access";

export type NavAccess = {
  role: UserRole;
  isPlatformAdmin: boolean;
  showTeamNav: boolean;
  showSettingsNav: boolean;
};

type NavUser = {
  role: UserRole;
  orgSlug: string;
  isPlatformAdmin: boolean;
};

/** Prefer membership (DB) over the cookie snapshot so demotions hide nav immediately. */
export function buildNavAccessFromUser(user: NavUser | null): NavAccess | null {
  if (!user?.role || !user.orgSlug) return null;

  return {
    role: user.role,
    isPlatformAdmin: canAccessPlatformAdmin({
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
      orgSlug: user.orgSlug,
    }),
    showTeamNav: hasPermission(user.role, "users:read"),
    showSettingsNav: hasPermission(user.role, "settings:manage"),
  };
}

export function buildNavAccess(session: AppSession | null): NavAccess | null {
  const user = session?.user;
  if (!user?.role || !user.orgSlug) return null;

  return buildNavAccessFromUser({
    role: user.role as UserRole,
    orgSlug: user.orgSlug,
    isPlatformAdmin: Boolean(user.isPlatformAdmin),
  });
}
