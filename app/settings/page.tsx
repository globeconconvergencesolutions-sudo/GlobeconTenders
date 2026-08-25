import { SettingsHub } from "@/components/settings/settings-hub";
import { getSettingsAccessForUser } from "@/lib/auth/settings-access";
import { getSessionUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function SettingsIndexPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const access = await getSettingsAccessForUser({
    userId: user.id,
    role: user.role,
  });

  return <SettingsHub canManageSettings={access.canManageSettings} />;
}
