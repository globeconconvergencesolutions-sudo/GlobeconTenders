"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Cloud,
  FileText,
  Settings,
  User,
  Users,
  X,
} from "lucide-react";

import { SidebarFiltersLazy } from "@/components/filters/sidebar-filters-lazy";
import { AppLogo } from "@/components/brand/app-logo";
import { SidebarContextPanel } from "@/components/layout/sidebar-context-panel";
import { SidebarFooter } from "@/components/layout/sidebar-footer";
import { useLexicon, useFeatures } from "@/components/providers/org-context-provider";
import { hasPermission } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/db/schema";
import {
  getSidebarMode,
  sidebarShowsFilters,
} from "@/lib/navigation/sidebar-routes";
import { cn } from "@/lib/utils";

const navItemDefs = [
  { href: "/", icon: FileText, key: "navHome" as const, feature: null },
  {
    href: "/analytics",
    icon: BarChart3,
    key: "navAnalytics" as const,
    feature: "analytics" as const,
  },
  { href: "/profile", icon: User, key: "navProfile" as const, feature: null },
];

const sidebarScrollClass =
  "overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-color:rgba(255,255,255,0.14)_transparent] [scrollbar-width:thin]";

type SidebarPanelProps = {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
};

export function SidebarBrand({ compact = false }: { compact?: boolean }) {
  return <AppLogo size={compact ? "sm" : "sm"} showText compact={compact} variant="sidebar" />;
}

export function SidebarPanel({
  onNavigate,
  showClose = false,
  onClose,
}: SidebarPanelProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLexicon();
  const features = useFeatures();
  const role = session?.user?.role as UserRole | undefined;
  const showTeamNav = role ? hasPermission(role, "users:read") : false;
  const [showSettingsNav, setShowSettingsNav] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSettingsAccess() {
      try {
        const response = await fetch("/api/settings/access");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setShowSettingsNav(Boolean(data.canAccessSettings));
      } catch {
        // ignore — settings nav stays hidden
      }
    }
    if (session?.user) void loadSettingsAccess();
    return () => {
      cancelled = true;
    };
  }, [session?.user]);

  const mode = getSidebarMode(pathname);
  const showFilters = sidebarShowsFilters(mode);

  const extraNavItems = [
    ...(session?.user?.isPlatformAdmin
      ? [{ href: "/platform/orgs", label: "Platform", icon: Cloud }]
      : []),
    ...(showSettingsNav
      ? [{ href: "/settings", label: t("navSettings"), icon: Settings }]
      : []),
    ...(showTeamNav
      ? [{ href: "/admin/users", label: t("navTeam"), icon: Users }]
      : []),
  ];

  const allNavItems = [
    ...navItemDefs
      .filter((item) => !item.feature || features[item.feature])
      .map((item) => ({
        ...item,
        label: t(item.key),
      })),
    ...extraNavItems,
  ];

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[hsl(var(--sidebar))] via-[hsl(222_47%_9%)] to-[hsl(222_47%_7%)]">
      <div className="shrink-0 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <SidebarBrand />
          {showClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="shrink-0 px-4 pt-3 pb-2">
        <nav aria-label="Primary">
          <ul className="flex flex-col gap-0.5">
            {allNavItems.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/"
                  ? pathname === "/"
                  : pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                      active
                        ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                        : "text-slate-400 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{label}</span>
                    {href === "/" && !showFilters && (
                      <span className="ml-auto shrink-0 rounded-full bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-blue-200">
                        Filters
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="relative min-h-0 flex-1">
        <div className={cn("h-full px-4", sidebarScrollClass)}>
          <div className="py-2 pb-4">
            {showFilters ? (
              <SidebarFiltersLazy />
            ) : (
              <SidebarContextPanel mode={mode} onNavigate={onNavigate} />
            )}
          </div>
        </div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[hsl(222_47%_7%)] via-[hsl(222_47%_7%)]/60 to-transparent"
          aria-hidden
        />
      </div>

      <SidebarFooter />
    </div>
  );
}
