import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/auth.config";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";
import { buildLoginUrl } from "@/lib/auth/sign-out-constants";
import { ORG_STATUS_SUSPENDED } from "@/lib/platform/org-status";
import { getPlatformAppUrl } from "@/lib/tenant/config";
import { lookupOrganizationStatus } from "@/lib/tenant/lookup-org";
import {
  ORG_SLUG_HEADER,
  hostsMatch,
  isApexHost,
  resolveOrgSlugFromHost,
  resolveWorkspaceSlugFromSearchParams,
} from "@/lib/tenant/resolution";

const { auth } = NextAuth(authConfig);

const publicPaths = [
  "/login",
  "/api/auth",
  "/share",
  "/signup",
  "/api/signup",
  "/suspended",
];

const platformPaths = ["/platform"];

const adminRoles = new Set(["super_admin", "admin"]);

const cronPaths = [
  "/api/sync/cron",
  "/api/alerts/cron",
  "/api/platform/trials/cron",
  "/api/ingest",
];

export default auth(async (request) => {
  const { pathname } = request.nextUrl;
  const session = request.auth;
  const host = request.headers.get("host");

  // Auth routes first — no tenant DB work; logout must stay fast on edge.
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const hostOrgSlug = resolveOrgSlugFromHost(host);
  const workspaceFromLogin = resolveWorkspaceSlugFromSearchParams(
    request.nextUrl.searchParams,
  );
  // Authenticated requests must never fall back to the host default (globecon).
  const orgSlug = session?.user?.orgSlug
    ? session.user.orgSlug
    : (workspaceFromLogin ?? hostOrgSlug);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(ORG_SLUG_HEADER, orgSlug);
  requestHeaders.set("x-pathname", pathname);

  const withOrgHeader = () =>
    NextResponse.next({
      request: { headers: requestHeaders },
    });

  if (cronPaths.some((path) => pathname.startsWith(path))) {
    return withOrgHeader();
  }

  if (pathname === "/signup" || pathname.startsWith("/api/signup")) {
    if (!isApexHost(host)) {
      const signupUrl = new URL("/signup", getPlatformAppUrl());
      if (!hostsMatch(host, signupUrl.host)) {
        return NextResponse.redirect(signupUrl);
      }
    }

    if (session?.user && pathname === "/signup") {
      return NextResponse.redirect(new URL("/", request.url));
    }

    return withOrgHeader();
  }

  if (platformPaths.some((path) => pathname.startsWith(path))) {
    if (!session?.user?.isPlatformAdmin) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/", request.url));
    }
    return withOrgHeader();
  }

  const contextOrgSlug = session?.user?.orgSlug ?? orgSlug;
  const orgRecord = await lookupOrganizationStatus(contextOrgSlug);

  // Session points at a deleted/missing org — force a clean logout.
  if (
    session?.user &&
    session.user.orgSlug &&
    !orgRecord &&
    !publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    const logout = new URL("/api/auth/logout", request.url);
    logout.searchParams.set("redirect", buildLoginUrl(true));
    return NextResponse.redirect(logout);
  }

  if (
    orgRecord?.status === ORG_STATUS_SUSPENDED &&
    !publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Organization suspended", code: "ORG_SUSPENDED" },
        { status: 403 },
      );
    }
    return NextResponse.redirect(new URL("/suspended", request.url));
  }

  if (pathname === "/login" || pathname.startsWith("/login/")) {
    const signedOut = request.nextUrl.searchParams.get("signedOut") === "1";
    // Allow the signed-out landing page even if the cookie failed to clear,
    // so ForceSessionClear / the login UI can finish the job.
    if (session?.user && !signedOut) {
      const callback = sanitizeCallbackUrl(
        request.nextUrl.searchParams.get("callbackUrl"),
      );
      return NextResponse.redirect(new URL(callback, request.url));
    }

    return withOrgHeader();
  }

  if (
    publicPaths.some(
      (path) => pathname === path || pathname.startsWith(`${path}/`),
    )
  ) {
    return withOrgHeader();
  }

  if (pathname === "/" && isApexHost(host) && !session?.user) {
    return withOrgHeader();
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

  return withOrgHeader();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|brand/|manifest.webmanifest|.*\\.(?:png|ico|svg|webp)$).*)",
  ],
};
