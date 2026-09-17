import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { requireSettingsAccessPage } from "@/lib/auth/settings-page-guard";

export default async function SettingsNotificationsPage() {
  const { user } = await requireSettingsAccessPage();
  return <NotificationsSettings canSendNow={user.role === "super_admin"} />;
}
