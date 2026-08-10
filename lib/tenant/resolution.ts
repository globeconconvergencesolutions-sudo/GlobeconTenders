import {
  DEFAULT_ORG_SLUG,
  getAppUrlHost,
  getExtraApexHosts,
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

export function normalizeHost(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? host.toLowerCase();
}

function configuredApexHosts(): string[] {
  const appHost = getAppUrlHost();
  return [
    PLATFORM_WORKSPACE_HOST,
    PLATFORM_STAGING_HOST,
    "localhost",
    "127.0.0.1",
    ...getExtraApexHosts(),
    ...(appHost ? [appHost] : []),
  ];
}

/**
 * Netlify deploy apex: `{site}.netlify.app` (3 labels).
 * Tenant subdomain: `{slug}.{site}.netlify.app` (4+ labels).
 */
function isNetlifyApexHost(hostname: string): boolean {
  if (!hostname.endsWith(".netlify.app")) return false;
  return hostname.split(".").length === 3;
}

function netlifyTenantSlug(hostname: string): string | null {
  if (!hostname.endsWith(".netlify.app")) return null;
  const labels = hostname.split(".");
  if (labels.length < 4) return null;
  const slug = labels[0];
  if (!slug || !isValidOrgSlug(slug) || isReservedOrgSlug(slug)) return null;
  return slug;
}

function isWorkspaceHost(hostname: string): boolean {
  if (
    WORKSPACE_HOSTS.some(
      (allowed) =>
        hostname === allowed ||
        hostname.endsWith(`.${allowed}`) ||
        hostname.endsWith(".localhost"),
    )
  ) {
    return true;
  }

  const appHost = getAppUrlHost();
  if (
    appHost &&
    (hostname === appHost || hostname.endsWith(`.${appHost}`))
  ) {
    return true;
  }

  if (getExtraApexHosts().includes(hostname)) {
    return true;
  }

  // Any Netlify deploy URL is a valid workspace host.
  if (hostname.endsWith(".netlify.app")) {
    return true;
  }

  return false;
}

export function isApexHost(host: string | null): boolean {
  if (!host) return true;
  const hostname = normalizeHost(host);

  if (configuredApexHosts().includes(hostname)) {
    return true;
  }

  if (isNetlifyApexHost(hostname)) {
    return true;
  }

  return false;
}

/**
 * Resolve org slug from Host header.
 *
 * Patterns:
 * - `globecon.gcstenders.globeconcs.com` → `globecon`
 * - `acme.localhost` → `acme`
 * - `acme.gcstendersvic.netlify.app` → `acme`
 * - `gcstenders.globeconcs.com` / apex Netlify URL → default org
 */
export function resolveOrgSlugFromHost(host: string | null): string {
  if (!host) return DEFAULT_ORG_SLUG;

  const hostname = normalizeHost(host);

  if (!isWorkspaceHost(hostname)) {
    return DEFAULT_ORG_SLUG;
  }

  const netlifySlug = netlifyTenantSlug(hostname);
  if (netlifySlug) return netlifySlug;

  if (isApexHost(hostname)) {
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

  const appHost = getAppUrlHost();
  if (appHost && hostname.endsWith(`.${appHost}`)) {
    const sub = hostname.slice(0, -`.${appHost}`.length);
    if (sub && isValidOrgSlug(sub)) return sub;
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

/**
 * Compare two hosts for equality (ignoring port).
 */
export function hostsMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return false;
  return normalizeHost(left) === normalizeHost(right);
}
