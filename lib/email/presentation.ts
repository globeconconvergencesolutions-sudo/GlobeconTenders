import type { WorkspaceLexiconSettings } from "@/lib/db/schema";
import { resolveBranding, type ResolvedBranding } from "@/lib/branding/resolve";
import { resolveLexicon } from "@/lib/lexicon";
import { getWorkspaceSettings } from "@/lib/settings/workspace";

export type EmailOrgPresentation = ResolvedBranding & {
  lexicon: WorkspaceLexiconSettings;
  emailHeaderLabel: string;
};

export async function getEmailOrgPresentation(
  orgId: number,
): Promise<EmailOrgPresentation> {
  const settings = await getWorkspaceSettings(orgId);
  const lexicon = resolveLexicon(settings.lexicon);
  const branding = resolveBranding({
    organizationName: settings.organizationName,
    branding: settings.branding,
    lexicon,
  });

  return {
    ...branding,
    lexicon,
    emailHeaderLabel: `${branding.displayName} ${branding.productTagline}`,
  };
}
