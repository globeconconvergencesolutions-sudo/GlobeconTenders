import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignupWizard } from "@/components/signup/signup-wizard";
import { getPlatformAppUrl, PLATFORM_PRODUCT_NAME } from "@/lib/tenant/config";
import { hostsMatch, isApexHost } from "@/lib/tenant/resolution";

export const metadata: Metadata = {
  title: "Sign up",
  description: `Create your ${PLATFORM_PRODUCT_NAME} workspace — 14-day free trial`,
};

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/");
  }

  const headerStore = await headers();
  const host = headerStore.get("host");

  if (!isApexHost(host)) {
    const signupUrl = new URL("/signup", getPlatformAppUrl());
    if (!hostsMatch(host, signupUrl.host)) {
      redirect(signupUrl.toString());
    }
  }

  return <SignupWizard />;
}
