import { PlanSettings } from "@/components/settings/plan-settings";
import { requireSettingsManagePage } from "@/lib/auth/settings-page-guard";

export default async function SettingsPlanPage() {
  await requireSettingsManagePage();
  return <PlanSettings />;
}
