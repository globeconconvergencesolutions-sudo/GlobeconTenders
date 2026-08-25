"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Save } from "lucide-react";

import { FilterCommandBar } from "@/components/filters/filter-command-bar";
import { FilterDrawer } from "@/components/filters/filter-drawer";
import { FilterResultsOverlay } from "@/components/filters/filter-results-overlay";
import { FilterWorkspaceProvider, useFilterWorkspace } from "@/components/filters/filter-workspace-context";
import { useFeatures, useLexicon } from "@/components/providers/org-context-provider";
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
import { EMPTY_FILTER_STATE, type TenderWithSource, type UserRole } from "@/lib/db/schema";
import { mergeFilterStateWithUrl } from "@/lib/filters/url-state";
import type { OnboardingProgress } from "@/lib/onboarding/steps";
import type { TenderSort } from "@/lib/tenders/queries";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type CatalogFilterIds = {
  sourceIds: number[];
  serviceLineIds: number[];
  regionIds: number[];
  countryIds: number[];
};

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
  /** Effective catalog filters after URL∪DB merge (server). */
  initialCatalogFilters?: CatalogFilterIds;
  userRole: UserRole;
  onboardingProgress?: OnboardingProgress | null;
};

function TendersDashboardInner({
  tenders,
  stats,
  pagination,
  initialSearch = "",
  initialSort = "closing_soonest",
  savedOnly = false,
  initialHideClosed = true,
  initialCatalogFilters = {
    sourceIds: [],
    serviceLineIds: [],
    regionIds: [],
    countryIds: [],
  },
  userRole,
  onboardingProgress = null,
}: TendersDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { lexicon } = useLexicon();
  const features = useFeatures();
  const { openFilters, chips, removeChip, clearAll, applying, reloadDefaults } =
    useFilterWorkspace();

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
        const totalInserted = payload.results.reduce(
          (sum, r) => sum + r.inserted,
          0,
        );
        const totalUpdated = payload.results.reduce(
          (sum, r) => sum + r.updated,
          0,
        );
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
      // Persist the view the user is looking at (URL catalog overrides + toolbar).
      // Existing membership.filter_state JSON only — no schema migration.
      const effective = mergeFilterStateWithUrl(
        {
          ...EMPTY_FILTER_STATE,
          ...initialCatalogFilters,
        },
        searchParams,
      );
      const response = await fetch("/api/filters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceIds: effective.sourceIds,
          serviceLineIds: effective.serviceLineIds,
          regionIds: effective.regionIds,
          countryIds: effective.countryIds,
          search: search || undefined,
          sort,
          savedOnly: savedFilter,
          hideClosed,
        }),
      });
      if (response.ok) {
        setFilterSaved(true);
        showSuccessToast("View saved as your default");
        setTimeout(() => setFilterSaved(false), 2500);
        reloadDefaults();
        router.refresh();
      }
    } finally {
      setSavingFilter(false);
    }
  }

  return (
    <div className="flex flex-col bg-slate-50 dark:bg-background">
      <FilterCommandBar
        search={search}
        onSearchChange={setSearch}
        onSearchSubmit={() =>
          pushParams({ q: search || undefined, page: "1" })
        }
        savedFilter={savedFilter}
        onToggleSaved={() => {
          const next = !savedFilter;
          setSavedFilter(next);
          pushParams({ saved: next ? "1" : undefined, page: "1" });
        }}
        onSync={() => void handleSync()}
        onExport={() => void handleExport()}
        syncing={syncing}
        exporting={exporting}
        userRole={userRole}
        trackingSources={stats.trackingSources}
        lastSyncedLabel={lastSynced}
        chips={chips}
        onRemoveChip={removeChip}
        onClearAll={clearAll}
      />

      <FilterDrawer />

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
            className="w-full rounded-xl sm:w-auto"
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
            <SelectTrigger className="w-full rounded-xl sm:w-[200px]">
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
              "w-full rounded-xl sm:w-auto",
              filterSaved &&
                "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30",
            )}
            disabled={savingFilter}
            onClick={() => void handleSaveFilter()}
          >
            {savingFilter ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : filterSaved ? (
              <Check className="h-4 w-4 text-emerald-600" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {filterSaved ? "Filter saved" : "Save view"}
          </Button>
        </div>

        <div className="relative">
          <FilterResultsOverlay />
          <div
            className={cn(
              "grid gap-4 transition-[filter,opacity] duration-300 sm:grid-cols-2 2xl:grid-cols-3",
              applying && "opacity-60",
            )}
          >
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
              onAddSource={() => openFilters({ focusAddSource: true })}
              onSync={() => void handleSync()}
            />
          )}
        </div>

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

export function TendersDashboard(props: TendersDashboardProps) {
  return (
    <FilterWorkspaceProvider>
      <TendersDashboardInner {...props} />
    </FilterWorkspaceProvider>
  );
}
