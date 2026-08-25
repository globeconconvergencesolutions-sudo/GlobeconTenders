import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";

import { getAuthDb } from "@/lib/db/auth-db";
import * as schema from "@/lib/db/schema";
import { getPlatformAppUrl } from "@/lib/tenant/config";

function normalizeOrigin(url: string): string {
  return url.replace(/\/$/, "");
}

function resolveBaseURL(): string {
  return normalizeOrigin(
    process.env.BETTER_AUTH_URL ??
      process.env.AUTH_URL ??
      process.env.APP_URL ??
      getPlatformAppUrl(),
  );
}

function resolveTrustedOrigins(baseURL: string): string[] {
  const origins = new Set<string>([baseURL]);
  for (const value of [
    process.env.BETTER_AUTH_URL,
    process.env.AUTH_URL,
    process.env.APP_URL,
    getPlatformAppUrl(),
  ]) {
    if (value) origins.add(normalizeOrigin(value));
  }
  return [...origins];
}

function createAuth() {
  const db = getAuthDb();
  if (!db) {
    throw new Error("DATABASE_URL is required for authentication");
  }

  const baseURL = resolveBaseURL();

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
    trustedOrigins: resolveTrustedOrigins(baseURL),
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

export function getBetterAuth(): AuthInstance {
  if (!globalForAuth.__globetenderBetterAuth) {
    globalForAuth.__globetenderBetterAuth = createAuth();
  }
  return globalForAuth.__globetenderBetterAuth;
}

/**
 * Lazy proxy so importing this module during build does not require DATABASE_URL.
 *
 * Important: toNextJsHandler does `"handler" in auth ? auth.handler(req) : auth(req)`.
 * Without a `has` trap, `"handler" in proxy` is false and it calls the proxy as a
 * function → TypeError: auth/a is not a function on Netlify.
 */
export const auth = new Proxy({} as AuthInstance, {
  get(_target, prop, receiver) {
    const instance = getBetterAuth();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
  has(_target, prop) {
    return prop in getBetterAuth();
  },
  ownKeys() {
    return Reflect.ownKeys(getBetterAuth() as object);
  },
  getOwnPropertyDescriptor(_target, prop) {
    return Reflect.getOwnPropertyDescriptor(getBetterAuth() as object, prop);
  },
});

export type AppAuth = AuthInstance;
