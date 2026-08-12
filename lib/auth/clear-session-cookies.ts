import type { NextRequest, NextResponse } from "next/server";

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

const CHUNK_SUFFIXES = ["", ".0", ".1", ".2", ".3", ".4", ".5"] as const;

function cookieNamesToClear(request: NextRequest): string[] {
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

function isSecureCookieName(name: string): boolean {
  return name.startsWith("__Secure-") || name.startsWith("__Host-");
}

/**
 * Explicitly expire Auth.js cookies on a response.
 * Needed because some hosts drop Set-Cookie from Auth.js redirect responses,
 * and because chunked session cookies must each be cleared individually.
 */
export function appendClearedAuthCookies(
  response: NextResponse,
  request: NextRequest,
): void {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const envHttps =
    process.env.AUTH_URL?.startsWith("https://") === true ||
    process.env.APP_URL?.startsWith("https://") === true;
  const requestHttps =
    forwardedProto === "https" || request.nextUrl.protocol === "https:";

  for (const name of cookieNamesToClear(request)) {
    const secure = isSecureCookieName(name) || requestHttps || envHttps;
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      secure,
      maxAge: 0,
      expires: new Date(0),
    });
  }
}

export type AuthSignOutCookie = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

/** Merge Auth.js clear-cookie instructions onto a redirect response. */
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
