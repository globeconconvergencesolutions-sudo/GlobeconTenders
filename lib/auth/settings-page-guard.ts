import { redirect } from "next/navigation";

import { getSettingsAccessForUser } from "@/lib/auth/settings-access";
import { getSessionUser } from "@/lib/auth/session";

/** Super-admin (settings:manage) pages — notification delegates are redirected. */
export async function requireSettingsManagePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const access = await getSettingsAccessForUser({
    userId: user.id,
    role: user.role,
  });

  if (!access.canAccessSettings) redirect("/");
  if (!access.canManageSettings) redirect("/settings/notifications");

  return { user, access };
}
