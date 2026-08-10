import type {
  WorkspaceBrandingSettings,
  WorkspaceLexiconSettings,
} from "@/lib/db/schema";
import { BRAND, BRAND_ASSETS } from "@/lib/brand";

import {
  DEFAULT_ACCENT_COLOR,
  DEFAULT_PRIMARY_COLOR,
} from "./colors";

export type ResolvedBranding = {
  displayName: string;
  productTagline: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  fallbackLogoUrl: string;
};

export function resolveBranding(input: {
  organizationName: string;
  branding?: WorkspaceBrandingSettings | null;
  lexicon: WorkspaceLexiconSettings;
}): ResolvedBranding {
  const branding = input.branding ?? {};
  return {
    displayName: branding.displayName?.trim() || input.organizationName || BRAND.name,
    productTagline: input.lexicon.productTagline,
    primaryColor: branding.primaryColor?.trim() || DEFAULT_PRIMARY_COLOR,
    accentColor: branding.accentColor?.trim() || DEFAULT_ACCENT_COLOR,
    logoUrl: branding.logoUrl?.trim() || null,
    fallbackLogoUrl: BRAND_ASSETS.logoSidebar,
  };
}
