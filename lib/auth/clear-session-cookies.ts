import type { NextRequest, NextResponse } from "next/server";

import { signOut as authSignOut } from "@/auth";

/**
 * Clears the real Auth.js session cookie by delegating to Auth.js's own
 * signOut action instead of reimplementing its cookie name/attribute logic.
 * This guarantees the clearing Set-Cookie is byte-for-byte symmetric with
 * whatever cookie Auth.js actually set at login — including chunking and
 * any future change to cookie naming/attributes in an Auth.js upgrade.
 *
 * `redirect: false` stops next-auth from throwing a Next.js redirect for
 * us; the resulting Set-Cookie instructions are written into this request's
 * `next/headers` cookie jar (next-auth does this internally), which Next.js
 * merges into whatever response this route handler ultimately returns.
 */
async function clearRealSessionCookie(): Promise<void> {
  await authSignOut({ redirect: false });
}

/**
 * Auth.js v5 (and legacy next-auth v4) cookie base names, including chunked
 * variants used when the JWT exceeds ~4KB. Session-token names are also
 * covered here as belt-and-braces on top of `clearRealSessionCookie` above,
 * which is the authoritative clear.
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

function isAuthCookieName(name: string): boolean {
  return (
    name.includes("authjs.") ||
    name.includes("next-auth.") ||
    name.startsWith("__Secure-authjs") ||
    name.startsWith("__Host-authjs") ||
    name.startsWith("__Secure-next-auth") ||
    name.startsWith("__Host-next-auth")
  );
}

function namesToSweep(request: NextRequest): string[] {
  const names = new Set<string>();

  for (const base of AUTH_COOKIE_BASE_NAMES) {
    for (const suffix of CHUNK_SUFFIXES) {
      names.add(`${base}${suffix}`);
    }
  }

  // Also sweep anything actually present that looks like an Auth.js cookie,
  // in case a name/chunk pattern above ever falls out of date.
  for (const cookie of request.cookies.getAll()) {
    if (isAuthCookieName(cookie.name)) {
      names.add(cookie.name);
    }
  }

  return [...names];
}

/**
 * Expiry options for the defensive sweep below.
 *
 * IMPORTANT: never set an explicit `Domain` here. Auth.js sets its cookies
 * as host-only (no Domain attribute) by default, and this app does not
 * override that in auth.config.ts (no `cookies` key is configured there).
 * A clearing Set-Cookie with an explicit Domain — even one that textually
 * matches the request host — creates a *separate* entry in the browser's
 * cookie store rather than expiring the host-only cookie that's actually
 * there, so the browser silently keeps the original session cookie alive.
 *
 * That was the root cause of a previous bug where logout looked successful
 * (the page navigated to /login) while the real auth cookie stayed valid:
 * this code used to derive `Domain` from the request's `Host` header. It
 * only ever manifested in production, because `localhost`/`127.0.0.1` were
 * special-cased to skip Domain, masking the bug in local dev.
 *
 * If a custom cookie `domain` is ever added to auth.config.ts's `cookies`
 * option (e.g. for cross-subdomain SSO), mirror that exact fixed value
 * here explicitly — never derive it from the request host.
 */
function sweepExpireOptions(name: string, request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const requestHttps =
    forwardedProto === "https" || request.nextUrl.protocol === "https:";
  // Prefixed cookies MUST be cleared with Secure or the browser ignores the clear.
  const secure =
    name.startsWith("__Secure-") || name.startsWith("__Host-") || requestHttps;

  return {
    httpOnly: true as const,
    sameSite: "lax" as const,
    path: "/",
    secure,
    maxAge: 0,
    expires: new Date(0),
  };
}

/**
 * Defensive sweep: expires every cookie name Auth.js could plausibly have
 * set (current + legacy + chunked variants), plus anything actually present
 * on the request that looks like an Auth.js cookie. Pure belt-and-braces —
 * `clearRealSessionCookie` is what actually has to succeed for logout to
 * work; this covers auxiliary cookies (CSRF token, OAuth callback URL) and
 * any stray chunks it doesn't touch.
 */
function sweepStaleAuthCookies(response: NextResponse, request: NextRequest): void {
  for (const name of namesToSweep(request)) {
    response.cookies.set(name, "", sweepExpireOptions(name, request));
  }
}

/**
 * Full logout: authoritative session-cookie clear (via Auth.js's own
 * signOut) plus a defensive sweep of any other Auth.js cookies.
 */
export async function performLogout(
  response: NextResponse,
  request: NextRequest,
): Promise<void> {
  await clearRealSessionCookie();
  sweepStaleAuthCookies(response, request);
}
