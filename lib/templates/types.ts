import type {
  WorkspaceBrandingSettings,
  WorkspaceLexiconSettings,
  WorkspaceNotificationSettings,
} from "@/lib/db/schema";

import type { CustomFieldDefinition } from "@/lib/db/schema";

export type PlatformTemplate = {
  id: string;
  version: string;
  name: string;
  description: string;
  catalogPack: string;
  branding: WorkspaceBrandingSettings;
  lexicon: WorkspaceLexiconSettings;
  features: {
    analytics: boolean;
    publicShare: boolean;
    sync: boolean;
    matchScore: boolean;
    export: boolean;
  };
  layout: {
    homeCardVariant: "procurement" | "hr" | "community" | "academic";
    sidebarSections: Array<
      "sources" | "serviceLines" | "regions" | "countries" | "departments"
    >;
  };
  notifications: {
    enabled: boolean;
  };
  customFields?: CustomFieldDefinition[];
};

export type TemplateCatalogSeed = {
  name: string;
  slug: string;
  keywords: string[];
};

export type TemplateRegionSeed = TemplateCatalogSeed & {
  countries: TemplateCatalogSeed[];
};
