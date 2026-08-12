import { NextRequest, NextResponse } from "next/server";

import { signOut } from "@/auth";
import {
  appendClearedAuthCookies,
  applyAuthSignOutCookies,
  type AuthSignOutCookie,
} from "@/lib/auth/clear-session-cookies";
import { buildLoginUrl } from "@/lib/auth/sign-out-constants";

function sanitizeLogoutRedirect(path: string | null): string {
  const fallback = buildLoginUrl(true);
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  return path;
}

function absoluteRedirect(request: NextRequest, path: string): URL {
  // Prefer forwarded host so Set-Cookie + Location match the public URL (Netlify/proxy).
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host");
  const proto =
    forwardedProto ??
    (request.nextUrl.protocol === "https:" ? "https" : "http");

  if (host) {
    return new URL(path, `${proto}://${host}`);
  }

  const authUrl = process.env.AUTH_URL ?? process.env.APP_URL;
  if (authUrl) {
    return new URL(path, authUrl.replace(/\/$/, ""));
  }

  return new URL(path, request.nextUrl.origin);
}

/**
 * Full-page sign out.
 *
 * Auth.js `signOut({ redirect: false })` returns cookie-clear instructions; we
 * apply those onto our own 303 redirect and also expire every known Auth.js
 * cookie name (including chunks). Returning a manual redirect without copying
 * cookies is what previously left users logged in on Netlify.
 */
async function handleLogout(request: NextRequest) {
  const redirectTo = sanitizeLogoutRedirect(
    request.nextUrl.searchParams.get("redirect"),
  );
  const target = absoluteRedirect(request, redirectTo);
  const response = NextResponse.redirect(target, 303);

  try {
    const result = (await signOut({
      redirect: false,
      redirectTo,
    })) as { cookies?: AuthSignOutCookie[] } | undefined;

    applyAuthSignOutCookies(response, result?.cookies);
  } catch (error) {
    console.error("[auth/logout] signOut failed; clearing cookies manually", error);
  }

  appendClearedAuthCookies(response, request);

  // Prevent caches from keeping a logged-in document around the redirect.
  response.headers.set("Cache-Control", "no-store, max-age=0");

  return response;
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
