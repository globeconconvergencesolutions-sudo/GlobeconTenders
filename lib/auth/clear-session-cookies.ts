import type { NextRequest, NextResponse } from "next/server";

/**
 * Auth.js legacy names + Better Auth cookie names (incl. chunked JWT leftovers).
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
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
  "better-auth.session-token",
  "__Secure-better-auth.session-token",
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
    name.includes("better-auth") ||
    name.startsWith("__Secure-authjs") ||
    name.startsWith("__Host-authjs") ||
    name.startsWith("__Secure-next-auth") ||
    name.startsWith("__Host-next-auth") ||
    name.startsWith("__Secure-better-auth")
  );
}

function namesToSweep(request: NextRequest): string[] {
  const names = new Set<string>();

  for (const base of AUTH_COOKIE_BASE_NAMES) {
    for (const suffix of CHUNK_SUFFIXES) {
      names.add(`${base}${suffix}`);
    }
  }

  for (const cookie of request.cookies.getAll()) {
    if (isAuthCookieName(cookie.name)) {
      names.add(cookie.name);
    }
  }

  return [...names];
}

/**
 * IMPORTANT: never set an explicit `Domain` here — host-only cookies only.
 */
function sweepExpireOptions(name: string, request: NextRequest) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const requestHttps =
    forwardedProto === "https" || request.nextUrl.protocol === "https:";
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

function sweepStaleAuthCookies(response: NextResponse, request: NextRequest): void {
  for (const name of namesToSweep(request)) {
    response.cookies.set(name, "", sweepExpireOptions(name, request));
  }
}

export async function performLogout(
  response: NextResponse,
  request: NextRequest,
): Promise<void> {
  sweepStaleAuthCookies(response, request);
}
