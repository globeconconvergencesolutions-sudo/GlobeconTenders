import { BrandingSettings } from "@/components/settings/branding-settings";
import { requireSettingsManagePage } from "@/lib/auth/settings-page-guard";

export default async function SettingsBrandingPage() {
  await requireSettingsManagePage();
  return <BrandingSettings />;
}
