import type { NextAuthConfig } from "next-auth";

import { DEFAULT_ORG_SLUG } from "@/lib/tenant/config";

// Auth.js uses AUTH_URL for secure cookies in production. Fall back to APP_URL.
if (!process.env.AUTH_URL && process.env.APP_URL) {
  process.env.AUTH_URL = process.env.APP_URL.replace(/\/$/, "");
}

type UserRole = "super_admin" | "admin" | "analyst" | "viewer";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      orgId: number;
      orgSlug: string;
      isPlatformAdmin: boolean;
    };
  }

  interface User {
    role: UserRole;
    orgId: number;
    orgSlug: string;
    isPlatformAdmin: boolean;
  }
}

/** Edge-safe auth config — no database imports. Used by middleware. */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.orgId = user.orgId;
        token.orgSlug = user.orgSlug;
        token.isPlatformAdmin = user.isPlatformAdmin;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as UserRole | undefined) ?? "viewer";
        session.user.name =
          (token.name as string | undefined) ?? session.user.name;
        session.user.email =
          (token.email as string | undefined) ?? session.user.email;
        session.user.orgId = Number(token.orgId ?? 0);
        session.user.orgSlug =
          (token.orgSlug as string | undefined) ?? DEFAULT_ORG_SLUG;
        session.user.isPlatformAdmin =
          Boolean(token.isPlatformAdmin) &&
          session.user.orgSlug === DEFAULT_ORG_SLUG;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
