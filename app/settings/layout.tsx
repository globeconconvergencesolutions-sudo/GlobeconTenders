import { redirect } from "next/navigation";

import { SettingsShell } from "@/components/settings/settings-shell";
import { getSettingsAccessForUser } from "@/lib/auth/settings-access";
import { getSessionUser } from "@/lib/auth/session";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const access = await getSettingsAccessForUser({
    userId: user.id,
    role: user.role,
  });

  if (!access.canAccessSettings) {
    redirect("/");
  }

  return (
    <SettingsShell canManageSettings={access.canManageSettings}>
      {children}
    </SettingsShell>
  );
}
