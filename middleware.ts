import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";

const { auth } = NextAuth(authConfig);

const publicPaths = ["/login", "/api/auth", "/share"];

const adminRoles = new Set(["super_admin", "admin"]);

const cronPaths = ["/api/sync/cron", "/api/alerts/cron"];

export default auth((request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;

  if (cronPaths.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    if (session?.user) {
      const callback = sanitizeCallbackUrl(
        request.nextUrl.searchParams.get("callbackUrl"),
      );
      return NextResponse.redirect(new URL(callback, request.url));
    }
    return NextResponse.next();
  }

  if (
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return NextResponse.next();
  }

  if (!session?.user) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (
    pathname.startsWith("/admin") &&
    !adminRoles.has(session.user.role ?? "")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|manifest.webmanifest|.*\\.(?:png|ico|svg|webp)$).*)",
  ],
};
