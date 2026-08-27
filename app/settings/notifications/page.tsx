import { NotificationsSettings } from "@/components/settings/notifications-settings";
import { requireSettingsAccessPage } from "@/lib/auth/settings-page-guard";

export default async function SettingsNotificationsPage() {
  await requireSettingsAccessPage();
  return <NotificationsSettings />;
}
