import type {
  WorkspaceFeaturesSettings,
  WorkspaceLayoutSettings,
} from "@/lib/db/schema";

import { loadTemplate } from "./load";

export { layoutShowsSection } from "./layout-utils";

export function resolveFeatures(
  stored: Partial<WorkspaceFeaturesSettings> | null | undefined,
  templateId = "procurement",
): WorkspaceFeaturesSettings {
  const template = loadTemplate(templateId);
  return {
    ...template.features,
    ...(stored ?? {}),
  };
}

export function resolveLayout(
  stored: Partial<WorkspaceLayoutSettings> | null | undefined,
  templateId = "procurement",
): WorkspaceLayoutSettings {
  const template = loadTemplate(templateId);
  return {
    homeCardVariant:
      stored?.homeCardVariant ?? template.layout.homeCardVariant,
    sidebarSections:
      stored?.sidebarSections ?? template.layout.sidebarSections,
  };
}
