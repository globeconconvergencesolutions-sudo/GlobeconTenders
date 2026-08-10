"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  Download,
  Heart,
  Loader2,
  RefreshCw,
  Save,
  Search,
} from "lucide-react";

import { useLexicon, useFeatures } from "@/components/providers/org-context-provider";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { OpportunityEmptyState } from "@/components/tenders/opportunity-empty-state";
import { StatsCards } from "@/components/tenders/stats-cards";
import {
  SyncFeedbackBanner,
  type SyncFeedbackResult,
} from "@/components/tenders/sync-feedback-banner";
import {
  EmailAlertFeedbackBanner,
  type EmailAlertFeedback,
} from "@/components/tenders/email-alert-feedback-banner";
import { OpportunityCard } from "@/components/tenders/opportunity-card";
import { ApiErrorAlert } from "@/components/ui/api-error-alert";
import { readApiError, type ParsedClientError } from "@/lib/api/client-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  canExportTenders,
  canSaveTenders,
  canSync,
  canCreateSources,
} from "@/lib/auth/permissions";
import type { TenderWithSource, UserRole } from "@/lib/db/schema";
import type { OnboardingProgress } from "@/lib/onboarding/steps";
import type { TenderSort } from "@/lib/tenders/queries";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type SerializableTender = Omit<
  TenderWithSource,
  "deadline" | "createdAt" | "updatedAt"
> & {
  deadline: string;
  createdAt: string;
  updatedAt: string;
};

type SerializableStats = {
  matchingTenders: number;
  closingWithin3Days: number;
  openInDatabase: number;
  activeSources: number;
  lastSynced: string | null;
  trackingSources: number;
};

type PaginationMeta = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

type TendersDashboardProps = {
  tenders: SerializableTender[];
  stats: SerializableStats;
  pagination: PaginationMeta;
  initialSearch?: string;
  initialSort?: TenderSort;
  savedOnly?: boolean;
  initialHideClosed?: boolean;
  userRole: UserRole;
  onboardingProgress?: OnboardingProgress | null;
};

export function TendersDashboard({
  tenders,
  stats,
  pagination,
  initialSearch = "",
  initialSort = "closing_soonest",
  savedOnly = false,
  initialHideClosed = true,
  userRole,
  onboardingProgress = null,
}: TendersDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, lexicon } = useLexicon();
  const features = useFeatures();
  const [search, setSearch] = useState(initialSearch);
  const [hideClosed, setHideClosed] = useState(initialHideClosed);
  const [sort, setSort] = useState<TenderSort>(initialSort);
  const [savedFilter, setSavedFilter] = useState(savedOnly);
  const [syncing, setSyncing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [savingFilter, setSavingFilter] = useState(false);
  const [filterSaved, setFilterSaved] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<SyncFeedbackResult[] | null>(
    null,
  );
  const [syncError, setSyncError] = useState<ParsedClientError | null>(null);
  const [emailAlertFeedback, setEmailAlertFeedback] =
    useState<EmailAlertFeedback | null>(null);

  const normalizedTenders = useMemo<TenderWithSource[]>(
    () =>
      tenders.map((t) => ({
        ...t,
        deadline: new Date(t.deadline),
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      })),
    [tenders],
  );

  const lastSynced = stats.lastSynced
    ? new Date(stats.lastSynced).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Never";

  function pushParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    router.push(`/?${params.toString()}`);
  }

  function buildPageHref(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    return `/?${params.toString()}`;
  }

  function triggerAddSource() {
    document.querySelector<HTMLButtonElement>("[data-add-source-trigger]")?.click();
  }

  async function handleSync() {
    if (!canSync(userRole)) return;
    setSyncing(true);
    setSyncFeedback(null);
    setSyncError(null);
    setEmailAlertFeedback(null);
    try {
      const response = await fetch("/api/sync", { method: "POST" });
      if (!response.ok) {
        setSyncError(await readApiError(response, "Sync request failed"));
        return;
      }
      const payload = (await response.json()) as {
        results?: SyncFeedbackResult[];
        alerts?: EmailAlertFeedback | null;
      };

      if (payload.results?.length) {
        setSyncFeedback(payload.results);
        const totalInserted = payload.results.reduce((sum, r) => sum + r.inserted, 0);
        const totalUpdated = payload.results.reduce((sum, r) => sum + r.updated, 0);
        showSuccessToast(
          `Sync complete — ${totalInserted} new, ${totalUpdated} updated`,
        );
      } else {
        showSuccessToast("Sync complete");
      }
      if (payload.alerts) {
        setEmailAlertFeedback(payload.alerts);
      }
      router.refresh();
    } catch {
      setSyncFeedback([
        {
          sourceName: "Sync",
          inserted: 0,
          updated: 0,
          errors: ["Network error — check your connection and try again"],
        },
      ]);
    } finally {
      setSyncing(false);
    }
  }

  async function handleExport() {
    if (!canExportTenders(userRole)) return;
    setExporting(true);
    try {
      const params = new URLSearchParams(searchParams.toString());
      if (search && !params.has("q")) params.set("q", search);
      window.location.assign(`/api/tenders/export?${params.toString()}`);
    } finally {
      setTimeout(() => setExporting(false), 1500);
    }
  }

  async function handleSaveFilter() {
    setSavingFilter(true);
    setFilterSaved(false);
    try {
      const response = await fetch("/api/filters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: search || undefined,
          sort,
          savedOnly: savedFilter,
          hideClosed,
        }),
      });
      if (response.ok) {
        setFilterSaved(true);
        showSuccessToast("Filter preferences saved");
        setTimeout(() => setFilterSaved(false), 2500);
      }
    } finally {
      setSavingFilter(false);
    }
  }

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-background">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-border dark:bg-card sm:px-6 lg:px-8 lg:py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Latest {lexicon.opportunityPlural.toLowerCase()}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tracking {stats.trackingSources} {lexicon.sourcePlural.toLowerCase()} · last synced {lastSynced}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center xl:w-auto">
            <form
              className="relative w-full sm:min-w-[14rem] sm:flex-1 xl:w-64 xl:flex-none"
              onSubmit={(e) => {
                e.preventDefault();
                pushParams({ q: search || undefined, page: "1" });
              }}
            >
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search title, agency, or se..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9"
              />
            </form>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              {features.sync && (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={!canSync(userRole) || syncing}
                onClick={handleSync}
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
                  "w-full sm:w-auto",
                  savedFilter && "border-blue-300 bg-blue-50 dark:bg-blue-950/30",
                )}
                onClick={() => {
                  const next = !savedFilter;
                  setSavedFilter(next);
                  pushParams({ saved: next ? "1" : undefined, page: "1" });
                }}
              >
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">Saved</span>
              </Button>
              {features.export && (
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                disabled={!canExportTenders(userRole) || exporting}
                onClick={handleExport}
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
      </header>

      <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {onboardingProgress && (
          <OnboardingChecklist
            initialProgress={onboardingProgress}
            canManage={userRole === "super_admin"}
          />
        )}

        {syncError && (
          <ApiErrorAlert
            error={syncError}
            className="mb-4"
            onDismiss={() => setSyncError(null)}
          />
        )}
        {syncFeedback && (
          <SyncFeedbackBanner
            results={syncFeedback}
            onDismiss={() => setSyncFeedback(null)}
          />
        )}

        {emailAlertFeedback &&
          (emailAlertFeedback.sent > 0 || emailAlertFeedback.failed > 0) && (
            <EmailAlertFeedbackBanner
              alerts={emailAlertFeedback}
              onDismiss={() => setEmailAlertFeedback(null)}
            />
          )}

        <StatsCards stats={stats} />

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Button
            size="sm"
            variant={hideClosed ? "default" : "outline"}
            onClick={() => {
              const next = !hideClosed;
              setHideClosed(next);
              pushParams({
                showClosed: next ? undefined : "1",
                page: "1",
              });
            }}
            className="w-full sm:w-auto"
          >
            {hideClosed ? "✓ Hiding closed" : "Show closed"}
          </Button>

          <Select
            value={sort}
            onValueChange={(v) => {
              const next = v as TenderSort;
              setSort(next);
              pushParams({ sort: next, page: "1" });
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="closing_soonest">
                Sort: Closing soonest
              </SelectItem>
              <SelectItem value="recently_issued">
                Sort: Recently issued
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full sm:w-auto",
              filterSaved && "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30",
            )}
            disabled={savingFilter}
            onClick={handleSaveFilter}
          >
            {savingFilter ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : filterSaved ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {filterSaved ? "Filter saved" : "Save Filter"}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {normalizedTenders.map((tender) => (
            <OpportunityCard
              key={tender.id}
              tender={tender}
              canSave={canSaveTenders(userRole)}
            />
          ))}
        </div>

        {normalizedTenders.length === 0 && (
          <OpportunityEmptyState
            canSync={canSync(userRole) && features.sync}
            canAddSource={canCreateSources(userRole)}
            onAddSource={triggerAddSource}
            onSync={handleSync}
          />
        )}

        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          buildHref={buildPageHref}
        />
      </div>
    </div>
  );
}
