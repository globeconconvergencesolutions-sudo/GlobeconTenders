import { TemplateSettings } from "@/components/settings/template-settings";
import { requireSettingsManagePage } from "@/lib/auth/settings-page-guard";

export default async function SettingsTemplatePage() {
  await requireSettingsManagePage();
  return <TemplateSettings />;
}
