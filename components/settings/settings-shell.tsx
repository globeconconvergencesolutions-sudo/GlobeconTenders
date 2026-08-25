"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import {
  filterSettingsNavGroups,
  isSettingsNavActive,
} from "@/lib/settings/nav";
import { cn } from "@/lib/utils";

type SettingsShellProps = {
  canManageSettings: boolean;
  children: React.ReactNode;
};

export function SettingsShell({
  canManageSettings,
  children,
}: SettingsShellProps) {
  const pathname = usePathname();
  const groups = filterSettingsNavGroups(canManageSettings);

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-background">
      <header className="shrink-0 border-b border-slate-200/80 bg-white dark:border-border dark:bg-card">
        <div className="relative overflow-hidden px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.07),_transparent_55%)]" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-900/20 dark:bg-blue-600">
              <Settings className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Workspace settings
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Identity, alerts, template, and plan — organized for your team
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-8">
        {/* Mobile section scroller */}
        <nav
          aria-label="Settings sections"
          className="flex shrink-0 gap-2 overflow-x-auto pb-1 lg:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {groups.flatMap((group) =>
            group.items.map((item) => {
              const active = isSettingsNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-100"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-border dark:bg-card dark:text-slate-300",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </Link>
              );
            }),
          )}
        </nav>

        {/* Desktop left rail */}
        <aside className="hidden w-60 shrink-0 lg:block xl:w-64">
          <nav
            aria-label="Settings sections"
            className="sticky top-6 space-y-6"
          >
            {groups.map((group) => (
              <div key={group.id}>
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  {group.label}
                </p>
                <ul className="space-y-1">
                  {group.items.map((item) => {
                    const active = isSettingsNavActive(pathname, item.href);
                    const Icon = item.icon;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-all",
                            active
                              ? "bg-white shadow-sm ring-1 ring-slate-200/80 dark:bg-card dark:ring-border"
                              : "hover:bg-white/70 dark:hover:bg-white/[0.04]",
                          )}
                        >
                          <span
                            className={cn(
                              "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                              active
                                ? "bg-blue-600 text-white shadow-md shadow-blue-600/25"
                                : "bg-slate-100 text-slate-500 group-hover:bg-slate-200/80 dark:bg-white/10 dark:text-slate-300",
                            )}
                          >
                            <Icon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          <span className="min-w-0">
                            <span
                              className={cn(
                                "block text-sm font-medium",
                                active
                                  ? "text-slate-900 dark:text-white"
                                  : "text-slate-700 dark:text-slate-200",
                              )}
                            >
                              {item.label}
                            </span>
                            <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
                              {item.description}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
