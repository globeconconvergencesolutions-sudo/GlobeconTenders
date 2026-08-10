import type { WorkspaceFeaturesSettings } from "@/lib/db/schema";

import { getOrgContext } from "@/lib/tenant/org-context";

export async function getOrgFeatures(): Promise<WorkspaceFeaturesSettings> {
  const ctx = await getOrgContext();
  return ctx.features;
}

export async function requireOrgFeature(
  feature: keyof WorkspaceFeaturesSettings,
): Promise<void> {
  const features = await getOrgFeatures();
  if (!features[feature]) {
    throw new Error("FEATURE_DISABLED");
  }
}
