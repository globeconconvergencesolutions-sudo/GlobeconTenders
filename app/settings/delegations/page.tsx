import { DelegationsSettings } from "@/components/settings/delegations-settings";
import { requireSettingsManagePage } from "@/lib/auth/settings-page-guard";

export default async function SettingsDelegationsPage() {
  await requireSettingsManagePage();
  return <DelegationsSettings />;
}
