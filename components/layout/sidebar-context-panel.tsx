"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bell,
  FileText,
  Shield,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

import { useLexicon } from "@/components/providers/org-context-provider";
import type { SidebarMode } from "@/lib/navigation/sidebar-routes";

type SidebarContextPanelProps = {
  mode: SidebarMode;
  onNavigate?: () => void;
};

type PageBriefing = {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: string;
  hint?: string;
};

function briefingForMode(mode: SidebarMode): PageBriefing | null {
  switch (mode) {
    case "tenders":
      return null;
    case "analytics":
      return {
        icon: <BarChart3 className="h-4 w-4" />,
        title: "Analytics",
        description:
          "Pipeline insights across all sources, regions, and recent sync runs.",
        accent: "from-violet-500/20 via-transparent to-blue-500/10",
        hint: "Charts use the full database — not page filters.",
      };
    case "profile":
      return {
        icon: <Bell className="h-4 w-4" />,
        title: "Your profile",
        description:
          "Manage Gmail alert preferences for closing-soon and high-match digests.",
        accent: "from-emerald-500/20 via-transparent to-blue-500/10",
        hint: "Alert digests respect filters set on the home pipeline.",
      };
    case "team":
      return {
        icon: <Shield className="h-4 w-4" />,
        title: "Team management",
        description:
          "Invite colleagues and assign roles — super admins control all access levels.",
        accent: "from-amber-500/20 via-transparent to-orange-500/10",
        hint: "Analysts sync & export; viewers are read-only.",
      };
    case "settings":
      return {
        icon: <Settings className="h-4 w-4" />,
        title: "Workspace settings",
        description:
          "Control who receives digests and delegate recipient management.",
        accent: "from-slate-500/20 via-transparent to-violet-500/10",
        hint: "Explicit recipient list — users can still opt out on Profile.",
      };
    default:
      return {
        icon: <Sparkles className="h-4 w-4" />,
        title: "GlobeTender Cloud",
        description:
          "Live opportunities from World Bank, PPIP, Tender Yetu, AfDB, UNDP & more.",
        accent: "from-slate-500/15 via-transparent to-blue-500/10",
      };
  }
}

export function SidebarContextPanel({
  mode,
  onNavigate,
}: SidebarContextPanelProps) {
  const { t } = useLexicon();
  const briefing = briefingForMode(mode);

  if (!briefing) return null;

  return (
    <div className="space-y-3 pb-1">
      <div
        className={`rounded-xl border border-white/[0.08] bg-gradient-to-br p-3.5 ${briefing.accent}`}
      >
        <div className="mb-2.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
          {briefing.icon}
        </div>
        <h3 className="text-sm font-semibold text-white">{briefing.title}</h3>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-300/90">
          {briefing.description}
        </p>
        {briefing.hint && (
          <p className="mt-2 rounded-lg bg-black/20 px-2 py-1.5 text-[10px] leading-snug text-slate-400">
            {briefing.hint}
          </p>
        )}
      </div>

      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-blue-400/30 hover:bg-blue-500/10 hover:text-white"
      >
        <span className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 text-blue-300" />
          {t("navHome")} & filters
        </span>
        <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      </Link>

      {mode === "team" && (
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-2.5 py-2 text-[10px] text-slate-400">
          <Users className="h-3.5 w-3.5 shrink-0 text-violet-300" />
          Super admins manage all roles
        </div>
      )}
    </div>
  );
}
