import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { LoginHero } from "@/components/auth/login-hero";
import { LoginSessionCleanup } from "@/components/auth/login-session-cleanup";
import { AppLogo } from "@/components/brand/app-logo";
import { sanitizeCallbackUrl } from "@/lib/auth/callback-url";
import { DEFAULT_ORG_SLUG, PLATFORM_PRODUCT_NAME } from "@/lib/tenant/config";
import { getOrgContext } from "@/lib/tenant/org-context";
import { isValidOrgSlug } from "@/lib/tenant/resolution";

export const metadata: Metadata = {
  title: "Sign in",
  description: `Secure sign in to ${PLATFORM_PRODUCT_NAME}`,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    callbackUrl?: string;
    signedOut?: string;
    workspace?: string;
  }>;
}) {
  const params = await searchParams;
  const callbackUrl = sanitizeCallbackUrl(params.callbackUrl);
  const signedOut = params.signedOut === "1";
  const workspaceParam = params.workspace?.trim().toLowerCase();
  const orgSlug =
    workspaceParam && isValidOrgSlug(workspaceParam)
      ? workspaceParam
      : DEFAULT_ORG_SLUG;
  const orgContext = await getOrgContext();
  const session = await auth();

  // Stale sessions after logout are cleared on the client (Route Handler only).
  if (session?.user && !signedOut) {
    redirect(callbackUrl);
  }

  return (
    <div className="flex min-h-dvh w-full overflow-y-auto bg-slate-950">
      <LoginSessionCleanup signedOut={signedOut} />
      <LoginHero />

      <div className="flex w-full flex-1 flex-col justify-center px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <AppLogo size="md" variant="login" />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Welcome back
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Sign in to access {orgContext.lexicon.opportunityPlural.toLowerCase()},
                filters, and {orgContext.lexicon.sync.toLowerCase()} tools.
              </p>
            </div>

            <LoginForm callbackUrl={callbackUrl} orgSlug={orgSlug} />
          </div>

          {process.env.NODE_ENV === "development" && (
            <p className="mt-6 text-center text-xs text-slate-600">
              Dev: seeded admin is admin@globecon.com — change password after
              first login.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
