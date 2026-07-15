import { redirect } from "next/navigation";

import { DelegationsSettings } from "@/components/settings/delegations-settings";
import { getSettingsAccessForUser } from "@/lib/auth/settings-access";
import { getSessionUser } from "@/lib/auth/session";

export default async function SettingsDelegationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const access = await getSettingsAccessForUser({
    userId: user.id,
    role: user.role,
  });

  if (!access.canManageDelegations) {
    redirect("/settings/notifications");
  }

  return <DelegationsSettings />;
}
