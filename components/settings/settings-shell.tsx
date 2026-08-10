"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { cn } from "@/lib/utils";

type SettingsShellProps = {
  canManageDelegations: boolean;
  children: React.ReactNode;
};

const tabs: Array<{
  href: string;
  label: string;
  description: string;
  superAdminOnly?: boolean;
}> = [
  {
    href: "/settings/notifications",
    label: "Notifications",
    description: "Alert recipients & delivery",
  },
  {
    href: "/settings/delegations",
    label: "Delegations",
    description: "Grant recipient management",
    superAdminOnly: true,
  },
  {
    href: "/settings/branding",
    label: "Branding",
    description: "Logo, colors & display name",
    superAdminOnly: true,
  },
  {
    href: "/settings/lexicon",
    label: "Terminology",
    description: "Product labels & language",
    superAdminOnly: true,
  },
  {
    href: "/settings/template",
    label: "Template",
    description: "Vertical defaults & reapply",
    superAdminOnly: true,
  },
  {
    href: "/settings/plan",
    label: "Plan",
    description: "Usage, limits & upgrade",
    superAdminOnly: true,
  },
];

export function SettingsShell({
  canManageDelegations,
  children,
}: SettingsShellProps) {
  const pathname = usePathname();
  const visibleTabs = tabs.filter(
    (tab) => !tab.superAdminOnly || canManageDelegations,
  );

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-background">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-border dark:bg-card sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-slate-800">
              <Settings className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Workspace settings
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Organization alerts, branding, terminology, and access delegation
              </p>
            </div>
          </div>

          <nav
            aria-label="Settings sections"
            className="flex flex-wrap gap-2"
          >
            {visibleTabs.map((tab) => {
              const active = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded-xl border px-4 py-2.5 text-left transition-all",
                    active
                      ? "border-blue-200 bg-blue-50 text-blue-900 shadow-sm dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:border-border dark:bg-card dark:text-slate-300 dark:hover:text-white",
                  )}
                >
                  <span className="block text-sm font-medium">{tab.label}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {tab.description}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}
