import Link from "next/link";

import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { PLATFORM_PRODUCT_NAME } from "@/lib/tenant/config";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-6 dark:bg-background">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg dark:border-border dark:bg-card">
        <div className="mb-6 flex justify-center">
          <AppLogo size="md" variant="login" />
        </div>
        <h1 className="text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page doesn&apos;t exist on {PLATFORM_PRODUCT_NAME}, or you may not have
          access to it.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Back to dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
