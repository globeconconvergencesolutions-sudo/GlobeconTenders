import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/db";
import {
  orgMemberships,
  organizations,
  users,
  type UserRole,
} from "@/lib/db/schema";
import { orgAllowsLogin } from "@/lib/platform/org-status";
import { canAccessPlatformAdmin } from "@/lib/platform/access";
import { isValidOrgSlug } from "@/lib/tenant/resolution";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  orgSlug: z.string().optional(),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => {
      if (user) {
        token.sub = user.id;
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.orgId = user.orgId;
        token.orgSlug = user.orgSlug;
        token.isPlatformAdmin = user.isPlatformAdmin;
        token.isActive = true;
        return token;
      }

      if (token.sub) {
        const db = getDb();
        if (db && token.orgId && token.orgSlug) {
          const userId = Number(token.sub);
          const orgId = Number(token.orgId);

          const [membership] = await db
            .select({
              role: orgMemberships.role,
              isActive: orgMemberships.isActive,
              userName: users.name,
              userEmail: users.email,
              userActive: users.isActive,
              isPlatformAdmin: users.isPlatformAdmin,
            })
            .from(orgMemberships)
            .innerJoin(users, eq(users.id, orgMemberships.userId))
            .where(
              and(
                eq(orgMemberships.orgId, orgId),
                eq(orgMemberships.userId, userId),
              ),
            )
            .limit(1);

          if (!membership?.isActive || !membership.userActive) {
            token.isActive = false;
          } else {
            token.isActive = true;
            token.role = membership.role as UserRole;
            token.name = membership.userName;
            token.email = membership.userEmail;
            token.isPlatformAdmin = membership.isPlatformAdmin;
          }
        } else if (db) {
          const [row] = await db
            .select({
              role: users.role,
              isActive: users.isActive,
              name: users.name,
              email: users.email,
              isPlatformAdmin: users.isPlatformAdmin,
            })
            .from(users)
            .where(eq(users.id, Number(token.sub)))
            .limit(1);

          if (!row?.isActive) {
            token.isActive = false;
          } else {
            token.isActive = true;
            token.role = row.role;
            token.name = row.name;
            token.email = row.email;
            token.isPlatformAdmin = row.isPlatformAdmin;
          }
        }
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token.isActive === false) {
        return { expires: session.expires };
      }
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = (token.role as UserRole | undefined) ?? "viewer";
        session.user.name =
          (token.name as string | undefined) ?? session.user.name;
        session.user.email =
          (token.email as string | undefined) ?? session.user.email;
        session.user.orgId = Number(token.orgId ?? 0);
        session.user.orgSlug =
          (token.orgSlug as string | undefined) ?? "";
        session.user.isPlatformAdmin = canAccessPlatformAdmin({
          isPlatformAdmin: Boolean(token.isPlatformAdmin),
          orgSlug: session.user.orgSlug,
        });
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        orgSlug: { label: "Organization", type: "text" },
      },
      authorize: async (credentials) => {
        const orgSlugRaw =
          typeof credentials?.orgSlug === "string"
            ? credentials.orgSlug.trim().toLowerCase()
            : "";
        const parsed = credentialsSchema.safeParse({
          email:
            typeof credentials?.email === "string"
              ? credentials.email.trim().toLowerCase()
              : credentials?.email,
          password: credentials?.password,
          orgSlug: orgSlugRaw || undefined,
        });
        if (!parsed.success) return null;

        // Workspace ID is required — never silently fall back to globecon.
        if (!parsed.data.orgSlug || !isValidOrgSlug(parsed.data.orgSlug)) {
          return null;
        }
        const orgSlug = parsed.data.orgSlug;

        const db = getDb();
        if (!db) {
          console.error("[auth] DATABASE_URL is not configured");
          return null;
        }

        const [org] = await db
          .select({
            id: organizations.id,
            slug: organizations.slug,
            status: organizations.status,
          })
          .from(organizations)
          .where(eq(organizations.slug, orgSlug))
          .limit(1);

        if (!org || !orgAllowsLogin(org.status)) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1);

        if (!user || !user.isActive) return null;

        const [membership] = await db
          .select({ role: orgMemberships.role, isActive: orgMemberships.isActive })
          .from(orgMemberships)
          .where(
            and(
              eq(orgMemberships.orgId, org.id),
              eq(orgMemberships.userId, user.id),
            ),
          )
          .limit(1);

        if (!membership?.isActive) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: membership.role as UserRole,
          orgId: org.id,
          orgSlug: org.slug,
          isPlatformAdmin: user.isPlatformAdmin,
        };
      },
    }),
  ],
});
