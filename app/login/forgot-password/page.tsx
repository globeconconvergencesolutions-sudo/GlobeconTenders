import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { LoginHero } from "@/components/auth/login-hero";
import { AppLogo } from "@/components/brand/app-logo";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Forgot password",
  description: `Reset your ${BRAND.fullName} password`,
};

export default async function ForgotPasswordPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

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
                Forgot password?
              </h2>
              <p className="mt-2 text-sm text-slate-400">
                Enter your work email and we&apos;ll send a reset link if an
                account exists.
              </p>
            </div>

            <ForgotPasswordForm />
          </div>
        </div>
      </div>
    </div>
  );
}
