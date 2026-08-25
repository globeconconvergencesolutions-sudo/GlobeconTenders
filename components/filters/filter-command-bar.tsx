"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Download,
  Filter,
  Heart,
  Loader2,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { useFilterWorkspace } from "@/components/filters/filter-workspace-context";
import {
  useFeatures,
  useLexicon,
} from "@/components/providers/org-context-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  canExportTenders,
  canSync,
} from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/db/schema";
import type { FilterChip } from "@/lib/filters/catalog-types";
import { cn } from "@/lib/utils";

type FilterCommandBarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  savedFilter: boolean;
  onToggleSaved: () => void;
  onSync: () => void;
  onExport: () => void;
  syncing: boolean;
  exporting: boolean;
  userRole: UserRole;
  trackingSources: number;
  lastSyncedLabel: string;
  chips: FilterChip[];
  onRemoveChip: (chip: FilterChip) => void;
  onClearAll: () => void;
};

export function FilterCommandBar({
  search,
  onSearchChange,
  onSearchSubmit,
  savedFilter,
  onToggleSaved,
  onSync,
  onExport,
  syncing,
  exporting,
  userRole,
  trackingSources,
  lastSyncedLabel,
  chips,
  onRemoveChip,
  onClearAll,
}: FilterCommandBarProps) {
  const { openFilters, applying, justApplied, activeCount } = useFilterWorkspace();
  const { t, lexicon } = useLexicon();
  const features = useFeatures();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!applying && !justApplied) return;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 700);
    return () => window.clearTimeout(timer);
  }, [applying, justApplied]);

  return (
    <div className="relative overflow-hidden border-b border-slate-200/80 bg-white dark:border-border dark:bg-card">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(37,99,235,0.08),_transparent_55%)]" />

      <div className="relative space-y-4 px-4 py-5 sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600/80 dark:text-blue-300/80">
              Workspace pipeline
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[1.75rem]">
              Latest {lexicon.opportunityPlural.toLowerCase()}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Tracking {trackingSources} {lexicon.sourcePlural.toLowerCase()} ·
              last synced {lastSyncedLabel}
            </p>
          </div>

          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto xl:justify-end">
            <Button
              type="button"
              onClick={() => openFilters()}
              aria-keyshortcuts="F"
              title="Open filters (F)"
              className={cn(
                "h-11 rounded-xl px-4 font-semibold shadow-md shadow-blue-600/20 transition-all",
                activeCount > 0
                  ? "bg-blue-600 hover:bg-blue-500"
                  : "bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500",
                pulse && "ring-2 ring-blue-300 ring-offset-2",
              )}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : justApplied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Filter className="h-4 w-4" />
              )}
              Filters
              {activeCount > 0 && (
                <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold tabular-nums">
                  {activeCount}
                </span>
              )}
            </Button>

            <form
              className="relative w-full sm:min-w-[16rem] sm:flex-1 xl:w-72 xl:flex-none"
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit();
              }}
            >
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder={`Search ${lexicon.opportunityPlural.toLowerCase()}…`}
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-11 rounded-xl border-slate-200 bg-slate-50/80 pl-10 shadow-sm dark:border-border dark:bg-background"
              />
            </form>

            <div className="grid grid-cols-3 gap-2 sm:flex">
              {features.sync && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-xl sm:px-3"
                  disabled={!canSync(userRole) || syncing}
                  onClick={onSync}
                  data-sync-trigger
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{t("sync")}</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-11 rounded-xl sm:px-3",
                  savedFilter &&
                    "border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-400/40 dark:bg-rose-500/10 dark:text-rose-200",
                )}
                onClick={onToggleSaved}
              >
                <Heart
                  className={cn("h-4 w-4", savedFilter && "fill-current")}
                />
                <span className="hidden sm:inline">Saved</span>
              </Button>
              {features.export && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-xl sm:px-3"
                  disabled={!canExportTenders(userRole) || exporting}
                  onClick={onExport}
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{t("export")}</span>
                </Button>
              )}
            </div>
          </div>
        </div>

        {(chips.length > 0 || applying || justApplied) && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {applying && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Updating results
                </span>
              )}
              {!applying && justApplied && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                  <Check className="h-3 w-3" />
                  Filters applied
                </span>
              )}
              {chips.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => onRemoveChip(chip)}
                  disabled={applying}
                  className="inline-flex max-w-[14rem] items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 transition hover:border-slate-300 hover:bg-white disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
                >
                  {chip.color && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: chip.color }}
                    />
                  )}
                  <span className="truncate">{chip.label}</span>
                  <X className="h-3 w-3 shrink-0 opacity-50" />
                </button>
              ))}
            </div>
            {chips.length > 0 && (
              <button
                type="button"
                onClick={onClearAll}
                disabled={applying}
                className="self-start text-xs font-semibold text-slate-500 underline-offset-2 transition hover:text-slate-800 hover:underline disabled:opacity-50 dark:hover:text-slate-200"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
