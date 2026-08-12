import type { NextRequest, NextResponse } from "next/server";
import { cookies as nextCookies } from "next/headers";

/**
 * Auth.js v5 (and legacy next-auth) session cookie names we must expire on logout.
 * Includes chunked variants used when the JWT exceeds ~4KB.
 */
const AUTH_COOKIE_BASE_NAMES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "__Secure-next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
] as const;

const CHUNK_SUFFIXES = [
  "",
  ".0",
  ".1",
  ".2",
  ".3",
  ".4",
  ".5",
  ".6",
  ".7",
  ".8",
  ".9",
] as const;

function getAuthCookieDomain(name: string, request: NextRequest): string | undefined {
  if (name.startsWith("__Host-")) {
    return undefined;
  }

  const hostHeader = request.headers.get("host");
  if (!hostHeader) return undefined;

  const host = hostHeader.split(":")[0].toLowerCase();
  if (!host || host === "localhost" || host === "127.0.0.1") return undefined;

  return host;
}

export function listAuthCookieNamesToClear(request: NextRequest): string[] {
  const names = new Set<string>();

  for (const base of AUTH_COOKIE_BASE_NAMES) {
    for (const suffix of CHUNK_SUFFIXES) {
      names.add(`${base}${suffix}`);
    }
  }

  for (const cookie of request.cookies.getAll()) {
    const name = cookie.name;
    if (
      name.includes("authjs.") ||
      name.includes("next-auth.") ||
      name.startsWith("__Secure-authjs") ||
      name.startsWith("__Host-authjs") ||
      name.startsWith("__Secure-next-auth") ||
      name.startsWith("__Host-next-auth")
    ) {
      names.add(name);
    }
  }

  return [...names];
}

function isPrefixedSecureCookie(name: string): boolean {
  return name.startsWith("__Secure-") || name.startsWith("__Host-");
}

function expireOptions(name: string, request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const requestHttps =
    forwardedProto === "https" || request.nextUrl.protocol === "https:";
  // Prefixed cookies MUST be cleared with Secure or the browser ignores the clear.
  const secure = isPrefixedSecureCookie(name) || requestHttps;

  const cookieDomain = getAuthCookieDomain(name, request);

  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure,
    domain: cookieDomain,
    maxAge: 0,
    expires: new Date(0),
  };
}

/**
 * Explicitly expire Auth.js cookies on a response.
 * Prefer attaching these to a 200 response — some CDNs (incl. Netlify) drop
 * Set-Cookie on 3xx redirects.
 */
export function appendClearedAuthCookies(
  response: NextResponse,
  request: NextRequest,
): void {
  for (const name of listAuthCookieNamesToClear(request)) {
    const options = expireOptions(name, request);
    response.cookies.set(name, "", options);
    // Raw header as well — matches Auth.js serialization more reliably on edge.
    const securePart = options.secure ? "; Secure" : "";
    const domainPart = options.domain ? `; Domain=${options.domain};` : "";
    const sameSitePart = options.sameSite
      ? `; SameSite=${options.sameSite}`
      : "";
    response.headers.append(
      "Set-Cookie",
      `${name}=; Path=/;${domainPart} Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly${sameSitePart}${securePart}`,
    );
  }
}

export type AuthSignOutCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

/** Merge Auth.js clear-cookie instructions onto a response. */
export function applyAuthSignOutCookies(
  response: NextResponse,
  cookies: AuthSignOutCookie[] | undefined,
): void {
  if (!cookies?.length) return;
  for (const cookie of cookies) {
    response.cookies.set(cookie.name, cookie.value, {
      ...cookie.options,
      path: cookie.options?.path ?? "/",
    });
  }
}

/** Also clear via Next.js cookie jar (merged into the outgoing response). */
export async function clearAuthCookiesInJar(
  request: NextRequest,
): Promise<void> {
  const jar = await nextCookies();
  for (const name of listAuthCookieNamesToClear(request)) {
    try {
      jar.set(name, "", expireOptions(name, request));
    } catch {
      try {
        jar.delete(name);
      } catch {
        // ignore — response.cookies is the primary path
      }
    }
  }
}
