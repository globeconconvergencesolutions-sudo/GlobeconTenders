import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { getDb } from "@/lib/db";
import { users, type UserRole } from "@/lib/db/schema";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token, user }) => {
      if (user) {
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
      }

      if (token.sub) {
        const db = getDb();
        if (db) {
          const [row] = await db
            .select({
              role: users.role,
              isActive: users.isActive,
              name: users.name,
              email: users.email,
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
      }
      return session;
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = credentialsSchema.safeParse({
          email:
            typeof credentials?.email === "string"
              ? credentials.email.trim().toLowerCase()
              : credentials?.email,
          password: credentials?.password,
        });
        if (!parsed.success) return null;

        const db = getDb();
        if (!db) {
          console.error("[auth] DATABASE_URL is not configured");
          return null;
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, parsed.data.email))
          .limit(1);

        if (!user || !user.isActive) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role as UserRole,
        };
      },
    }),
  ],
});
