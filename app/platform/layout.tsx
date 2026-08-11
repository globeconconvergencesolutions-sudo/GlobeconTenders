import { redirect } from "next/navigation";
import { Cloud } from "lucide-react";

import { PlatformOrgsPanel } from "@/components/platform/platform-orgs-panel";
import { getSessionUser } from "@/lib/auth/session";
import { canAccessPlatformAdmin } from "@/lib/platform/access";
import { PLATFORM_PRODUCT_NAME } from "@/lib/tenant/config";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!canAccessPlatformAdmin(user)) redirect("/");

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-background">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-border dark:bg-card sm:px-6 lg:px-8 lg:py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-800">
            <Cloud className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              {PLATFORM_PRODUCT_NAME}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Platform administration
            </p>
          </div>
        </div>
      </header>
      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
