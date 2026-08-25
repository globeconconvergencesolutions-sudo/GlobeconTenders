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

export function buildNavAccess(session: AppSession | null): NavAccess | null {
  const user = session?.user;
  if (!user?.role || !user.orgSlug) return null;

  const role = user.role as UserRole;

  return {
    role,
    isPlatformAdmin: canAccessPlatformAdmin({
      isPlatformAdmin: Boolean(user.isPlatformAdmin),
      orgSlug: user.orgSlug,
    }),
    showTeamNav: hasPermission(role, "users:read"),
    showSettingsNav: hasPermission(role, "settings:manage"),
  };
}
