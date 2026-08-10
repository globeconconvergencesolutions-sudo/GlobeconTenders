import { headers } from "next/headers";

import {
  ORG_SLUG_HEADER,
  resolveOrgSlugFromRequest,
} from "@/lib/tenant/resolution";
import {
  requireOrganizationBySlug,
  type ResolvedOrganization,
} from "@/lib/tenant/org";

export async function getRequestOrgSlug(): Promise<string> {
  const headerStore = await headers();
  return resolveOrgSlugFromRequest({
    host: headerStore.get("host"),
    headerSlug: headerStore.get(ORG_SLUG_HEADER),
  });
}

export async function getCurrentOrg(): Promise<ResolvedOrganization | null> {
  const slug = await getRequestOrgSlug();
  const { getOrganizationBySlug } = await import("@/lib/tenant/org");
  return getOrganizationBySlug(slug);
}

export async function requireCurrentOrg(): Promise<ResolvedOrganization> {
  const slug = await getRequestOrgSlug();
  return requireOrganizationBySlug(slug);
}
