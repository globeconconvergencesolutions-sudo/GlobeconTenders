import { isApexHost } from "@/lib/tenant/resolution";

export function shouldSkipAppShell(
  pathname: string,
  host: string | null,
  isAuthenticated: boolean,
): boolean {
  if (
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname === "/signup" ||
    pathname === "/share" ||
    pathname.startsWith("/share/") ||
    pathname === "/suspended"
  ) {
    return true;
  }

  if (pathname === "/" && isApexHost(host) && !isAuthenticated) {
    return true;
  }

  return false;
}
