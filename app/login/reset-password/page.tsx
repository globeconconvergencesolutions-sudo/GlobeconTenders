import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { LoginHero } from "@/components/auth/login-hero";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AppLogo } from "@/components/brand/app-logo";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Reset password",
  description: `Choose a new password for ${BRAND.fullName}`,
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const params = await searchParams;
  const token = params.token?.trim() ?? "";

  return (
    <div className="flex min-h-dvh w-full overflow-y-auto bg-slate-950">
      <LoginHero />

      <div className="flex w-full flex-1 flex-col justify-center px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <AppLogo size="md" variant="login" />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Choose a new password
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Pick something strong you haven&apos;t used elsewhere.
              </p>
            </div>

            {token ? (
              <ResetPasswordForm token={token} />
            ) : (
              <p className="text-sm text-red-200">
                Missing reset token. Open the link from your email or request a
                new one from the sign-in page.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
