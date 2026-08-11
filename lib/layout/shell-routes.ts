import { isApexHost } from "@/lib/tenant/resolution";

const authOnlyPaths = [
  "/login",
  "/signup",
  "/share",
  "/suspended",
] as const;

function isAuthOnlyRoute(pathname: string): boolean {
  return authOnlyPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Whether to wrap the page in the dashboard shell (sidebar + mobile header).
 *
 * Logged-in users always get the shell except on login/signup/share routes.
 * Logged-out users only skip the shell on the apex marketing home page.
 */
export function shouldUseAppShell(
  pathname: string,
  host: string | null,
  hasAppSession: boolean,
): boolean {
  if (isAuthOnlyRoute(pathname)) {
    return false;
  }

  if (hasAppSession) {
    return true;
  }

  if (pathname === "/" && isApexHost(host)) {
    return false;
  }

  return false;
}

/** @deprecated Use shouldUseAppShell */
export function shouldSkipAppShell(
  pathname: string,
  host: string | null,
  isAuthenticated: boolean,
): boolean {
  return !shouldUseAppShell(pathname, host, isAuthenticated);
}
