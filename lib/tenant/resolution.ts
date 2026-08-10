import {
  DEFAULT_ORG_SLUG,
  getAppUrlHost,
  PLATFORM_STAGING_HOST,
  PLATFORM_WORKSPACE_HOST,
  WORKSPACE_HOSTS,
  WORKSPACE_LOGIN_PARAM,
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
  if (appHost && hostname === appHost) {
    return true;
  }

  // Netlify deploy URLs (single-site tenancy).
  if (hostname.endsWith(".netlify.app")) {
    return true;
  }

  return false;
}

/**
 * Single-URL mode: the host does not identify the tenant.
 * Org context comes from the session or login workspace param.
 */
function isNetlifyDeployApex(hostname: string): boolean {
  return hostname.endsWith(".netlify.app") && hostname.split(".").length === 3;
}

export function isApexHost(host: string | null): boolean {
  if (!host) return true;
  const hostname = normalizeHost(host);

  if (
    hostname === PLATFORM_WORKSPACE_HOST ||
    hostname === PLATFORM_STAGING_HOST ||
    hostname === "localhost" ||
    hostname === "127.0.0.1"
  ) {
    return true;
  }

  const appHost = getAppUrlHost();
  if (appHost && hostname === appHost) {
    return true;
  }

  if (isNetlifyDeployApex(hostname)) {
    return true;
  }

  return false;
}

/**
 * In single-URL mode the hostname always maps to the default org slug.
 * Actual tenant selection uses session JWT or ?workspace= on login.
 */
export function resolveOrgSlugFromHost(_host: string | null): string {
  return DEFAULT_ORG_SLUG;
}

export function resolveWorkspaceSlugFromSearchParams(
  searchParams: URLSearchParams,
): string | null {
  const raw = searchParams.get(WORKSPACE_LOGIN_PARAM)?.trim().toLowerCase();
  if (!raw || !isValidOrgSlug(raw)) return null;
  return raw;
}

export function resolveOrgSlugFromRequest(input: {
  host?: string | null;
  headerSlug?: string | null;
  searchParams?: URLSearchParams;
}): string {
  const fromHeader = input.headerSlug?.trim().toLowerCase();
  if (fromHeader && isValidOrgSlug(fromHeader)) {
    return fromHeader;
  }

  const fromQuery = input.searchParams
    ? resolveWorkspaceSlugFromSearchParams(input.searchParams)
    : null;
  if (fromQuery) return fromQuery;

  return resolveOrgSlugFromHost(input.host ?? null);
}

export function hostsMatch(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  if (!left || !right) return false;
  return normalizeHost(left) === normalizeHost(right);
}
