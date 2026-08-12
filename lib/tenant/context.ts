import { headers } from "next/headers";

import { auth } from "@/auth";
import {
  ORG_SLUG_HEADER,
  resolveOrgSlugFromRequest,
} from "@/lib/tenant/resolution";
import {
  getOrganizationById,
  getOrganizationBySlug,
  requireOrganizationBySlug,
  type ResolvedOrganization,
} from "@/lib/tenant/org";

/**
 * Resolve the active tenant for this request.
 * Authenticated traffic MUST use session.orgId — never host/default slug.
 */
export async function getCurrentOrg(): Promise<ResolvedOrganization | null> {
  const session = await auth();
  const sessionOrgId = Number(session?.user?.orgId ?? 0);
  if (session?.user && sessionOrgId > 0) {
    return getOrganizationById(sessionOrgId);
  }

  // Unauthenticated / public only — slug from header or host (may be default).
  const headerStore = await headers();
  const slug = resolveOrgSlugFromRequest({
    host: headerStore.get("host"),
    headerSlug: headerStore.get(ORG_SLUG_HEADER),
  });
  return getOrganizationBySlug(slug);
}

export async function requireCurrentOrg(): Promise<ResolvedOrganization> {
  const session = await auth();
  const sessionOrgId = Number(session?.user?.orgId ?? 0);

  if (session?.user && sessionOrgId > 0) {
    const org = await getOrganizationById(sessionOrgId);
    if (!org) throw new Error("ORG_NOT_FOUND");
    return requireOrganizationBySlug(org.slug);
  }

  // Prefer explicit session slug over host default when present.
  if (session?.user?.orgSlug) {
    return requireOrganizationBySlug(session.user.orgSlug);
  }

  const headerStore = await headers();
  const slug = resolveOrgSlugFromRequest({
    host: headerStore.get("host"),
    headerSlug: headerStore.get(ORG_SLUG_HEADER),
  });
  return requireOrganizationBySlug(slug);
}

/** @deprecated Prefer getCurrentOrg / session.orgId — slug alone is unsafe. */
export async function getRequestOrgSlug(): Promise<string> {
  const session = await auth();
  if (session?.user?.orgSlug) {
    return session.user.orgSlug;
  }

  const headerStore = await headers();
  return resolveOrgSlugFromRequest({
    host: headerStore.get("host"),
    headerSlug: headerStore.get(ORG_SLUG_HEADER),
  });
}
