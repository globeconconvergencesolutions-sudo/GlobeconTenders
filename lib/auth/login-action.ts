"use server";

import { AuthError } from "next-auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

import { signIn } from "@/auth";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";
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
      error: "Enter a valid workspace ID (e.g. acme). Each organization is separate.",
    };
  }

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      orgSlug: workspace,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }

    if (error instanceof AuthError) {
      return {
        error:
          "Invalid email or password. Check your workspace ID and try again.",
      };
    }

    return { error: "Unable to sign in right now. Please try again." };
  }

  return {};
}
