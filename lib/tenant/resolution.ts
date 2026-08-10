import {
  DEFAULT_ORG_SLUG,
  PLATFORM_STAGING_HOST,
  PLATFORM_WORKSPACE_HOST,
  WORKSPACE_HOSTS,
} from "@/lib/tenant/config";

export const ORG_SLUG_HEADER = "x-org-slug";

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

const RESERVED_SLUGS = new Set([
  "www",
  "api",
  "app",
  "admin",
  "platform",
  "signup",
  "login",
  "staging",
  "globecon",
]);

export function isValidOrgSlug(slug: string): boolean {
  return SLUG_PATTERN.test(slug);
}

export function isReservedOrgSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

function normalizeHost(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? host.toLowerCase();
}

function isWorkspaceHost(hostname: string): boolean {
  return WORKSPACE_HOSTS.some(
    (allowed) =>
      hostname === allowed ||
      hostname.endsWith(`.${allowed}`) ||
      hostname.endsWith(".localhost"),
  );
}

export function isApexHost(host: string | null): boolean {
  if (!host) return true;
  const hostname = normalizeHost(host);
  return (
    hostname === PLATFORM_WORKSPACE_HOST ||
    hostname === PLATFORM_STAGING_HOST ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  );
}

/**
 * Resolve org slug from Host header.
 *
 * Patterns:
 * - `globecon.gcstenders.globeconcs.com` → `globecon`
 * - `acme.localhost` → `acme`
 * - `gcstenders.globeconcs.com` / `gcstenders.netlify.app` → default org
 */
export function resolveOrgSlugFromHost(host: string | null): string {
  if (!host) return DEFAULT_ORG_SLUG;

  const hostname = normalizeHost(host);

  if (!isWorkspaceHost(hostname)) {
    return DEFAULT_ORG_SLUG;
  }

  if (
    hostname === PLATFORM_WORKSPACE_HOST ||
    hostname === PLATFORM_STAGING_HOST ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return DEFAULT_ORG_SLUG;
  }

  if (hostname.endsWith(".localhost")) {
    const sub = hostname.slice(0, -".localhost".length);
    if (sub && isValidOrgSlug(sub)) return sub;
    return DEFAULT_ORG_SLUG;
  }

  if (hostname.endsWith(`.${PLATFORM_WORKSPACE_HOST}`)) {
    const sub = hostname.slice(0, -`.${PLATFORM_WORKSPACE_HOST}`.length);
    if (sub && isValidOrgSlug(sub)) return sub;
    return DEFAULT_ORG_SLUG;
  }

  if (hostname.endsWith(`.${PLATFORM_STAGING_HOST}`)) {
    const sub = hostname.slice(0, -`.${PLATFORM_STAGING_HOST}`.length);
    if (sub && isValidOrgSlug(sub)) return sub;
    return DEFAULT_ORG_SLUG;
  }

  return DEFAULT_ORG_SLUG;
}

export function resolveOrgSlugFromRequest(input: {
  host?: string | null;
  headerSlug?: string | null;
  searchParams?: URLSearchParams;
}): string {
  const fromHost = resolveOrgSlugFromHost(input.host ?? null);

  if (fromHost !== DEFAULT_ORG_SLUG) return fromHost;

  const fromHeader = input.headerSlug?.trim().toLowerCase();
  if (fromHeader && isValidOrgSlug(fromHeader)) return fromHeader;

  const fromQuery = input.searchParams?.get("org")?.trim().toLowerCase();
  if (fromQuery && isValidOrgSlug(fromQuery)) return fromQuery;

  return DEFAULT_ORG_SLUG;
}
