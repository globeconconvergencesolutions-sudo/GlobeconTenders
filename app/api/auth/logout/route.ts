import { NextRequest, NextResponse } from "next/server";

import { signOut } from "@/auth";
import {
  appendClearedAuthCookies,
  applyAuthSignOutCookies,
  clearAuthCookiesInJar,
  type AuthSignOutCookie,
} from "@/lib/auth/clear-session-cookies";
import { buildLoginUrl } from "@/lib/auth/sign-out-constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function sanitizeLogoutRedirect(path: string | null): string {
  const fallback = buildLoginUrl(true);
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  return path;
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Full-page sign out.
 *
 * IMPORTANT (Netlify / CDNs): Set-Cookie on 3xx redirects is often dropped.
 * We return HTTP 200 HTML with clear-cookie headers, then the browser navigates
 * to the login page via meta/script refresh. That is what actually clears
 * `__Secure-authjs.session-token`.
 */
async function handleLogout(request: NextRequest) {
  const redirectTo = sanitizeLogoutRedirect(
    request.nextUrl.searchParams.get("redirect"),
  );

  let authCookies: AuthSignOutCookie[] | undefined;
  try {
    const result = (await signOut({
      redirect: false,
      redirectTo,
    })) as { cookies?: AuthSignOutCookie[] } | undefined;
    authCookies = result?.cookies;
  } catch (error) {
    console.error(
      "[auth/logout] signOut failed; clearing cookies manually",
      error,
    );
  }

  await clearAuthCookiesInJar(request);

  const safePath = escapeHtmlAttr(redirectTo);
  const safeJson = JSON.stringify(redirectTo);
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta http-equiv="refresh" content="0;url=${safePath}" />
  <title>Signing out…</title>
  <style>
    body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
      font-family:system-ui,sans-serif;background:#020617;color:#e2e8f0}
  </style>
</head>
<body>
  <p>Signing you out…</p>
  <script>
    try { sessionStorage.removeItem("globetender-signing-out"); } catch (e) {}
    location.replace(${safeJson});
  </script>
</body>
</html>`;

  const response = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
    },
  });

  applyAuthSignOutCookies(response, authCookies);
  appendClearedAuthCookies(response, request);

  return response;
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
