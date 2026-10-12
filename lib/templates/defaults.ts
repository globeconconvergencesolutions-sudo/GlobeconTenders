import type {
  WorkspaceFeaturesSettings,
  WorkspaceLayoutSettings,
} from "@/lib/db/schema";

export const DEFAULT_PROCUREMENT_FEATURES: WorkspaceFeaturesSettings = {
  analytics: true,
  publicShare: true,
  sync: true,
  matchScore: true,
  export: true,
};

export const DEFAULT_PROCUREMENT_LAYOUT: WorkspaceLayoutSettings = {
  homeCardVariant: "procurement",
  sidebarSections: ["sources", "serviceLines", "regions", "countries"],
};

export const DEFAULT_HR_LAYOUT: WorkspaceLayoutSettings = {
  homeCardVariant: "hr",
  sidebarSections: ["sources", "serviceLines", "regions"],
};
