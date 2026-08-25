"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { setSessionWorkspaceFields } from "@/auth";
import { auth as betterAuth } from "@/lib/auth/better-auth";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";
import { ensureBetterAuthUser } from "@/lib/auth/ensure-better-auth-user";
import { getDb } from "@/lib/db";
import {
  orgMemberships,
  organizations,
  users,
  type UserRole,
} from "@/lib/db/schema";
import { canAccessPlatformAdmin } from "@/lib/platform/access";
import { orgAllowsLogin } from "@/lib/platform/org-status";
import { isValidOrgSlug } from "@/lib/tenant/resolution";

export type LoginActionState = {
  error?: string;
};

export async function loginWithCredentials(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const workspace = String(formData.get("workspace") ?? "")
    .trim()
    .toLowerCase();
  const callbackUrl = sanitizeCallbackUrl(
    String(formData.get("callbackUrl") ?? "/"),
  );

  if (!workspace || !isValidOrgSlug(workspace)) {
    return {
      error:
        "Enter a valid workspace ID (e.g. acme). Each organization is separate.",
    };
  }

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const db = getDb();
    if (!db) {
      return { error: "Unable to sign in right now. Please try again." };
    }

    const [org] = await db
      .select({
        id: organizations.id,
        slug: organizations.slug,
        status: organizations.status,
      })
      .from(organizations)
      .where(eq(organizations.slug, workspace))
      .limit(1);

    if (!org || !orgAllowsLogin(org.status)) {
      return {
        error:
          "Invalid email or password. Check your workspace ID and try again.",
      };
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user || !user.isActive) {
      return {
        error:
          "Invalid email or password. Check your workspace ID and try again.",
      };
    }

    const [membership] = await db
      .select({
        role: orgMemberships.role,
        isActive: orgMemberships.isActive,
      })
      .from(orgMemberships)
      .where(
        and(
          eq(orgMemberships.orgId, org.id),
          eq(orgMemberships.userId, user.id),
        ),
      )
      .limit(1);

    if (!membership?.isActive) {
      return {
        error:
          "Invalid email or password. Check your workspace ID and try again.",
      };
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return {
        error:
          "Invalid email or password. Check your workspace ID and try again.",
      };
    }

    await ensureBetterAuthUser({
      id: user.id,
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
    });

    const result = await betterAuth.api.signInEmail({
      body: { email, password },
      headers: await headers(),
    });

    const sessionToken =
      typeof result === "object" && result && "token" in result
        ? String((result as { token: string }).token)
        : "";
    if (!sessionToken) {
      return { error: "Unable to sign in right now. Please try again." };
    }

    const role = membership.role as UserRole;
    await setSessionWorkspaceFields({
      sessionToken,
      orgId: org.id,
      orgSlug: org.slug,
      role,
      isPlatformAdmin: canAccessPlatformAdmin({
        isPlatformAdmin: user.isPlatformAdmin,
        orgSlug: org.slug,
      }),
    });

    redirect(callbackUrl);
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    // Better Auth throws UNAUTHORIZED for missing credential account shape, etc.
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? Number((error as { statusCode: number }).statusCode)
        : NaN;
    if (status === 401) {
      return {
        error:
          "Invalid email or password. Check your workspace ID and try again.",
      };
    }

    console.error("[login] failed", error);
    return { error: "Unable to sign in right now. Please try again." };
  }
}
