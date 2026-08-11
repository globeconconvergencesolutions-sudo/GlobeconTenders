import { NextRequest, NextResponse } from "next/server";

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

/** Full-page sign out: clear session cookie, then redirect to login. */
export async function GET(request: NextRequest) {
  const redirectTo = sanitizeLogoutRedirect(
    request.nextUrl.searchParams.get("redirect"),
  );

  await signOut({ redirect: false });

  const response = NextResponse.redirect(new URL(redirectTo, request.url));
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}

export async function POST() {
  await signOut({ redirect: false });

  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
