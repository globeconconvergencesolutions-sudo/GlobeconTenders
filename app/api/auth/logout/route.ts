import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";

import { auth } from "@/auth";
import { performLogout } from "@/lib/auth/clear-session-cookies";
import { auth as betterAuth } from "@/lib/auth/better-auth";
import { bumpUserSessionVersion } from "@/lib/auth/session-version";
import { buildLoginUrl } from "@/lib/auth/sign-out-constants";
import { getAuthDb } from "@/lib/db/auth-db";
import { baSession } from "@/lib/db/schema";

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
 * 1) Delete Better Auth session row(s) — cookie can linger; session is dead.
 * 2) Bump users.session_version (belt-and-braces).
 * 3) Return HTTP 200 HTML with clear-cookie headers (CDN-safe).
 */
async function handleLogout(request: NextRequest) {
  const redirectTo = sanitizeLogoutRedirect(
    request.nextUrl.searchParams.get("redirect"),
  );

  const session = await auth();
  const userId = session?.user?.id ? Number(session.user.id) : NaN;

  try {
    await betterAuth.api.signOut({
      headers: request.headers,
    });
  } catch (error) {
    console.error("[logout] better-auth signOut failed", error);
  }

  if (Number.isFinite(userId) && userId > 0) {
    try {
      await bumpUserSessionVersion(userId);
    } catch (error) {
      console.error("[logout] failed to bump session_version", error);
    }

    try {
      const db = getAuthDb();
      if (db) {
        await db.delete(baSession).where(eq(baSession.userId, String(userId)));
      }
    } catch (error) {
      console.error("[logout] failed to delete ba_session rows", error);
    }
  }

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

  await performLogout(response, request);

  return response;
}

export async function GET(request: NextRequest) {
  return handleLogout(request);
}

export async function POST(request: NextRequest) {
  return handleLogout(request);
}
