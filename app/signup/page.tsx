import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { SignupWizard } from "@/components/signup/signup-wizard";
import { getPlatformAppUrl, PLATFORM_PRODUCT_NAME } from "@/lib/tenant/config";
import { isApexHost } from "@/lib/tenant/resolution";

export const metadata: Metadata = {
  title: "Sign up",
  description: `Create your ${PLATFORM_PRODUCT_NAME} workspace — 14-day free trial`,
};

export default async function SignupPage() {
  const headerStore = await headers();
  const host = headerStore.get("host");

  if (!isApexHost(host)) {
    redirect(new URL("/signup", getPlatformAppUrl()).toString());
  }

  return <SignupWizard />;
}
