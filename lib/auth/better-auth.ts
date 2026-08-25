import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import { getAuthDb } from "@/lib/db/auth-db";
import * as schema from "@/lib/db/schema";
import { getPlatformAppUrl } from "@/lib/tenant/config";

const baseURL = (
  process.env.BETTER_AUTH_URL ??
  process.env.AUTH_URL ??
  process.env.APP_URL ??
  getPlatformAppUrl()
).replace(/\/$/, "");

function createAuth() {
  const db = getAuthDb();
  if (!db) {
    throw new Error("DATABASE_URL is required for authentication");
  }

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      camelCase: true,
      schema: {
        user: schema.baUser,
        session: schema.baSession,
        account: schema.baAccount,
        verification: schema.baVerification,
      },
    }),
    secret: process.env.BETTER_AUTH_SECRET ?? process.env.AUTH_SECRET,
    baseURL,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      autoSignIn: false,
      password: {
        hash: async (password) => bcrypt.hash(password, 12),
        verify: async ({ hash, password }) => bcrypt.compare(password, hash),
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      additionalFields: {
        orgId: {
          type: "number",
          required: false,
          defaultValue: null,
          input: false,
        },
        orgSlug: {
          type: "string",
          required: false,
          defaultValue: null,
          input: false,
        },
        role: {
          type: "string",
          required: false,
          defaultValue: null,
          input: false,
        },
        isPlatformAdmin: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: false,
        },
      },
    },
    advanced: {
      database: {
        generateId: () => nanoid(),
      },
    },
    plugins: [nextCookies()],
  });
}

type AuthInstance = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as unknown as {
  __globetenderBetterAuth?: AuthInstance;
};

function getAuth(): AuthInstance {
  if (!globalForAuth.__globetenderBetterAuth) {
    globalForAuth.__globetenderBetterAuth = createAuth();
  }
  return globalForAuth.__globetenderBetterAuth;
}

/** Lazy proxy so importing this module during build does not require DATABASE_URL. */
export const auth = new Proxy({} as AuthInstance, {
  get(_target, prop, receiver) {
    const instance = getAuth();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export type AppAuth = AuthInstance;
