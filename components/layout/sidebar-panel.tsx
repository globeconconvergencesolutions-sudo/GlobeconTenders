"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Bookmark,
  Building2,
  CircleAlert,
  ClipboardCheck,
  Cloud,
  FileText,
  FolderLock,
  GitCompare,
  Kanban,
  LayoutGrid,
  LineChart,
  Radio,
  Settings,
  User,
  Users,
  X,
  ChevronDown,
} from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { SidebarFooter } from "@/components/layout/sidebar-footer";
import { useNavAccess } from "@/components/providers/nav-access-provider";
import {
  useFeatures,
  useLexicon,
  useOrg,
} from "@/components/providers/org-context-provider";
import { cn } from "@/lib/utils";

const moreGroups = [
  {
    label: "Discover",
    items: [
      { href: "/fields", label: "Fields", icon: LayoutGrid },
      { href: "/sources/health", label: "Sources", icon: Radio },
      { href: "/market", label: "Market", icon: LineChart },
    ],
  },
  {
    label: "Qualify",
    items: [
      { href: "/evidence", label: "Evidence", icon: FolderLock },
      { href: "/gaps", label: "Gaps", icon: CircleAlert },
    ],
  },
  {
    label: "Bid",
    items: [{ href: "/review", label: "Review", icon: GitCompare }],
  },
];

const sidebarScrollClass =
  "overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-color:rgba(255,255,255,0.14)_transparent] [scrollbar-width:thin]";

type SidebarPanelProps = {
  onNavigate?: () => void;
  showClose?: boolean;
  onClose?: () => void;
};

export function SidebarBrand({ compact = false }: { compact?: boolean }) {
  return (
    <AppLogo
      size={compact ? "sm" : "sm"}
      showText
      compact={compact}
      variant="sidebar"
    />
  );
}

export function SidebarPanel({
  onNavigate,
  showClose = false,
  onClose,
}: SidebarPanelProps) {
  const pathname = usePathname();
  const navAccess = useNavAccess();
  const { t } = useLexicon();
  const { orgSlug } = useOrg();
  const features = useFeatures();
  const [showSettingsFromGrants, setShowSettingsFromGrants] = useState(false);

  useEffect(() => {
    if (!navAccess || navAccess.showSettingsNav) return;

    let cancelled = false;
    async function loadSettingsAccess() {
      try {
        const response = await fetch("/api/settings/access");
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) {
          setShowSettingsFromGrants(Boolean(data.canAccessSettings));
        }
      } catch {
        // ignore — settings nav stays hidden
      }
    }

    void loadSettingsAccess();
    return () => {
      cancelled = true;
    };
  }, [navAccess]);

  const showSettingsNav =
    Boolean(navAccess?.showSettingsNav) || showSettingsFromGrants;

  const workspaceItems = [
    ...(features.analytics
      ? [{ href: "/analytics", label: t("navAnalytics"), icon: BarChart3 }]
      : []),
    { href: "/profile", label: t("navProfile"), icon: User },
    ...(navAccess?.isPlatformAdmin
      ? [{ href: "/platform/orgs", label: "Platform", icon: Cloud }]
      : []),
    ...(showSettingsNav
      ? [{ href: "/settings", label: t("navSettings"), icon: Settings }]
      : []),
    ...(navAccess?.showTeamNav
      ? [{ href: "/admin/users", label: t("navTeam"), icon: Users }]
      : []),
  ];

  const deskItemsResolved = features.pis
    ? [
        { href: "/", label: t("navHome"), icon: FileText },
        { href: "/watchlists", label: "Watchlists", icon: Bookmark },
        { href: "/company", label: "Company", icon: Building2 },
        { href: "/qualification", label: "Qualification", icon: ClipboardCheck },
        { href: "/pipeline", label: "Pipeline", icon: Kanban },
        { href: "/alerts", label: "Alerts", icon: Bell },
      ]
    : [
        { href: "/", label: t("navHome"), icon: FileText },
        ...workspaceItems,
      ];

  const moreSections = features.pis
    ? [...moreGroups, { label: "Workspace", items: workspaceItems }].filter(
        (group) => group.items.length > 0,
      )
    : [];

  const moreHrefs = moreSections.flatMap((group) => group.items.map((item) => item.href));
  const moreHasActive = moreHrefs.some((href) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`),
  );
  const [moreOpen, setMoreOpen] = useState(moreHasActive);

  useEffect(() => {
    if (moreHasActive) setMoreOpen(true);
  }, [moreHasActive]);

  function itemActive(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  function renderItems(
    items: Array<{ href: string; label: string; icon: typeof FileText }>,
  ) {
    return items.map(({ href, label, icon: Icon }) => {
      const active = itemActive(href);
      return (
        <li key={href}>
          <Link
            href={href}
            prefetch={false}
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
          </Link>
        </li>
      );
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-gradient-to-b from-[hsl(var(--sidebar))] via-[hsl(222_47%_9%)] to-[hsl(222_47%_7%)]">
      <div className="shrink-0 border-b border-white/[0.06] px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <SidebarBrand />
          </div>
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
        {orgSlug && (
          <p className="mt-2 truncate text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Workspace · {orgSlug}
          </p>
        )}
      </div>

      <div className={cn("min-h-0 flex-1 px-4 pt-3 pb-4", sidebarScrollClass)}>
        <nav aria-label="Primary">
          <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
            {features.pis ? "Desk" : "Workspace"}
          </p>
          <ul className="flex flex-col gap-0.5">{renderItems(deskItemsResolved)}</ul>
          {moreSections.length > 0 && (
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setMoreOpen((open) => !open)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06] hover:text-white"
                aria-expanded={moreOpen}
              >
                <span>More</span>
                <ChevronDown className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")} />
              </button>
              {moreOpen &&
                moreSections.map((group) => (
                  <div key={group.label} className="pt-3">
                    <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                      {group.label}
                    </p>
                    <ul className="flex flex-col gap-0.5">{renderItems(group.items)}</ul>
                  </div>
                ))}
            </div>
          )}
        </nav>
      </div>

      <SidebarFooter />
    </div>
  );
}
