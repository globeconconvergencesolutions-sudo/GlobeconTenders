import { LexiconSettings } from "@/components/settings/lexicon-settings";
import { requireSettingsManagePage } from "@/lib/auth/settings-page-guard";

export default async function SettingsLexiconPage() {
  await requireSettingsManagePage();
  return <LexiconSettings />;
}
