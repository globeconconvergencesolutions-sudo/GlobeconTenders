/** GlobeTender Cloud — platform & domain configuration */
export const PLATFORM_PRODUCT_NAME = "GlobeTender Cloud";

/** Production workspace host (DNS pointer target) */
export const PLATFORM_WORKSPACE_HOST = "gcstenders.globeconcs.com";

/** Netlify staging host until DNS cutover */
export const PLATFORM_STAGING_HOST =
  process.env.PLATFORM_STAGING_HOST ?? "gcstenders.netlify.app";

/** Default tenant when visiting apex workspace host (no org subdomain) */
export const DEFAULT_ORG_SLUG = "globecon";

/** Hosts that serve the workspace app (not marketing/platform-only) */
export const WORKSPACE_HOSTS = [
  PLATFORM_WORKSPACE_HOST,
  PLATFORM_STAGING_HOST,
  "localhost",
  "127.0.0.1",
] as const;

export function getPlatformAppUrl(): string {
  return (
    process.env.APP_URL?.replace(/\/$/, "") ??
    `https://${PLATFORM_STAGING_HOST}`
  );
}

/**
 * Optional comma-separated extra apex hosts (e.g. Netlify deploy URLs).
 * Example: PLATFORM_APEX_HOSTS=gcstendersvic.netlify.app
 */
export function getExtraApexHosts(): string[] {
  return (process.env.PLATFORM_APEX_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().split(":")[0] ?? "")
    .filter(Boolean);
}

export function getAppUrlHost(): string | null {
  const raw = process.env.APP_URL?.replace(/\/$/, "");
  if (!raw) return null;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Workspace URL pattern shown in signup UI — prefers APP_URL host when set.
 */
export function getWorkspaceHostLabel(): string {
  return getAppUrlHost() ?? PLATFORM_STAGING_HOST;
}
