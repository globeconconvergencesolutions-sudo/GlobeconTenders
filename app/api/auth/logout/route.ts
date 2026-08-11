import { NextRequest } from "next/server";

import { signOut } from "@/auth";
import { buildLoginUrl } from "@/lib/auth/sign-out-constants";

function sanitizeLogoutRedirect(path: string | null): string {
  const fallback = buildLoginUrl(true);
  if (!path) return fallback;
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("://")) {
    return fallback;
  }
  return path;
}

/**
 * Full-page sign out. Must return signOut({ redirectTo }) so Auth.js attaches
 * Set-Cookie headers that clear the session (including chunked cookies on HTTPS).
 * A manual NextResponse.redirect after signOut({ redirect: false }) drops those
 * headers and leaves users logged in on Netlify/production.
 */
export async function GET(request: NextRequest) {
  const redirectTo = sanitizeLogoutRedirect(
    request.nextUrl.searchParams.get("redirect"),
  );

  return signOut({ redirectTo });
}

export async function POST(request: NextRequest) {
  const redirectTo = sanitizeLogoutRedirect(
    request.nextUrl.searchParams.get("redirect"),
  );

  return signOut({ redirectTo });
}
