"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Check,
  ChevronDown,
  Filter,
  Loader2,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import { AddCatalogDialog } from "@/components/filters/add-catalog-dialog";
import { AddSourceDialog } from "@/components/filters/add-source-dialog";
import { CatalogItemMenu } from "@/components/filters/catalog-item-menu";
import { useFilterWorkspace } from "@/components/filters/filter-workspace-context";
import { ApiErrorAlert } from "@/components/ui/api-error-alert";
import { Checkbox } from "@/components/ui/checkbox";
import { useLayout, useLexicon } from "@/components/providers/org-context-provider";
import { readApiError, type ParsedClientError } from "@/lib/api/client-error";
import { canCreateSources, hasPermission } from "@/lib/auth/permissions";
import { EMPTY_FILTER_STATE, type FilterState } from "@/lib/db/schema";
import {
  buildFilterChips,
  type FilterCatalogResponse,
  type FilterChip,
} from "@/lib/filters/catalog-types";
import {
  countSidebarFilters,
  hasSidebarFilters,
} from "@/lib/filters/active-count";
import {
  mergeFilterStateWithUrl,
  writeCatalogFiltersToSearchParams,
  writeEmptyCatalogFiltersToSearchParams,
} from "@/lib/filters/url-state";
import { layoutShowsSection } from "@/lib/templates/layout-utils";
import { cn } from "@/lib/utils";

type FilterIdKey =
  | "sourceIds"
  | "serviceLineIds"
  | "regionIds"
  | "countryIds";

type OpportunityFiltersProps = {
  className?: string;
};

function FilterAccordion({
  title,
  icon,
  count,
  activeCount,
  defaultOpen = false,
  onAdd,
  canAdd,
  addButtonDataAttr,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  activeCount: number;
  defaultOpen?: boolean;
  onAdd?: () => void;
  canAdd?: boolean;
  addButtonDataAttr?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-border dark:bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03]"
        aria-expanded={open}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </span>
          <span className="text-xs text-slate-500">
            {activeCount > 0
              ? `${activeCount} selected · ${count} total`
              : `${count} available`}
          </span>
        </span>
        {activeCount > 0 && (
          <span className="rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      {open && (
        <div className="border-t border-slate-100 px-3 py-3 dark:border-white/[0.06]">
          {canAdd && onAdd && (
            <button
              type="button"
              onClick={onAdd}
              data-add-source-trigger={
                addButtonDataAttr === "add-source" ? true : undefined
              }
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-blue-400/50 dark:hover:bg-blue-500/10 dark:hover:text-blue-200"
            >
              <Plus className="h-3.5 w-3.5" />
              Add {title.toLowerCase()}
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  );
}

function FilterOptionRow({
  checked,
  onToggle,
  accentColor,
  label,
  subLabel,
  actions,
  disabled,
}: {
  checked: boolean;
  onToggle: () => void;
  accentColor?: string;
  label: string;
  subLabel?: string;
  actions?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-start gap-2 rounded-xl px-2.5 py-2 transition-all",
        checked
          ? "bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-500/15 dark:ring-blue-400/30"
          : "hover:bg-slate-50 dark:hover:bg-white/[0.04]",
        disabled && "pointer-events-none opacity-60",
      )}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
        <Checkbox
          checked={checked}
          disabled={disabled}
          onCheckedChange={onToggle}
          className="mt-0.5"
        />
        {accentColor && (
          <span
            className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white shadow-sm dark:ring-slate-900"
            style={{ backgroundColor: accentColor }}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
            {label}
          </span>
          {subLabel && (
            <span className="mt-0.5 block text-[11px] text-slate-500">
              {subLabel}
            </span>
          )}
        </span>
      </label>
      {actions && (
        <div className="shrink-0 opacity-70 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}

function catalogWithState(
  catalog: FilterCatalogResponse,
  filterState: FilterState,
): FilterCatalogResponse {
  return { ...catalog, filterState };
}

export function OpportunityFilters({ className }: OpportunityFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const layout = useLayout();
  const { lexicon } = useLexicon();
  const {
    setApplying,
    setActiveCount,
    setChips,
    registerActions,
    focusAddSource,
    clearFocusAddSource,
    applying,
    markJustApplied,
    justApplied,
  } = useFilterWorkspace();

  const showSources = layoutShowsSection(layout, "sources");
  const showCategories =
    layoutShowsSection(layout, "serviceLines") ||
    layoutShowsSection(layout, "departments");
  const showRegions =
    layoutShowsSection(layout, "regions") ||
    layoutShowsSection(layout, "countries");
  const categoryLabel = lexicon.categoryPlural;

  const [isPending, startTransition] = useTransition();
  const wasPendingRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [catalog, setCatalog] = useState<FilterCatalogResponse | null>(null);
  /** Saved DB defaults — never mutated by session URL toggles. */
  const [savedDefaults, setSavedDefaults] = useState<FilterState>(
    EMPTY_FILTER_STATE,
  );
  /** Instant checkbox feedback while the URL/RSC catch up. */
  const [optimisticCatalog, setOptimisticCatalog] = useState<Pick<
    FilterState,
    "sourceIds" | "serviceLineIds" | "regionIds" | "countryIds"
  > | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<
    Record<number, boolean>
  >({});
  const [serviceLineQuery, setServiceLineQuery] = useState("");
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [serviceLineDialogOpen, setServiceLineDialogOpen] = useState(false);
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [countryDialogOpen, setCountryDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<ParsedClientError | null>(null);

  const urlFilterState = useMemo(
    () => mergeFilterStateWithUrl(savedDefaults, searchParams),
    [savedDefaults, searchParams],
  );

  const effectiveFilterState = useMemo(() => {
    if (!optimisticCatalog) return urlFilterState;
    return {
      ...urlFilterState,
      ...optimisticCatalog,
    };
  }, [urlFilterState, optimisticCatalog]);

  const publishChips = useCallback(
    (nextCatalog: FilterCatalogResponse, state: FilterState) => {
      const withState = catalogWithState(nextCatalog, state);
      setChips(buildFilterChips(withState));
      setActiveCount(countSidebarFilters(state));
    },
    [setActiveCount, setChips],
  );

  const loadCatalog = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/filters");
      if (!response.ok) {
        setLoadError(await readApiError(response, "Failed to load filters"));
        return;
      }
      const data = await response.json();
      const next: FilterCatalogResponse = {
        ...data,
        archivedSources: data.archivedSources ?? [],
        archivedServiceLines: data.archivedServiceLines ?? [],
      };
      setCatalog(next);
      setSavedDefaults(next.filterState);
    } catch {
      setLoadError({ message: "Failed to load filters — try refreshing" });
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    if (!catalog) return;
    publishChips(catalog, effectiveFilterState);
  }, [catalog, effectiveFilterState, publishChips]);

  // Drop optimistic overlay once the URL matches (or when pending ends).
  useEffect(() => {
    setOptimisticCatalog(null);
  }, [searchParams]);

  useEffect(() => {
    setApplying(isPending || clearing);
  }, [isPending, clearing, setApplying]);

  useEffect(() => {
    if (wasPendingRef.current && !isPending && !clearing) {
      markJustApplied();
    }
    wasPendingRef.current = isPending;
  }, [isPending, clearing, markJustApplied]);

  useEffect(() => {
    if (!focusAddSource || loading) return;
    const timer = window.setTimeout(() => {
      document
        .querySelector<HTMLButtonElement>("[data-add-source-trigger]")
        ?.click();
      clearFocusAddSource();
    }, 280);
    return () => window.clearTimeout(timer);
  }, [focusAddSource, loading, clearFocusAddSource]);

  const pushCatalogToUrl = useCallback(
    (
      catalogIds: Pick<
        FilterState,
        "sourceIds" | "serviceLineIds" | "regionIds" | "countryIds"
      >,
    ) => {
      setOptimisticCatalog(catalogIds);
      const params = new URLSearchParams(searchParams.toString());
      writeCatalogFiltersToSearchParams(params, catalogIds);
      params.set("page", "1");
      const href = `/?${params.toString()}`;
      startTransition(() => {
        router.push(href);
      });
    },
    [router, searchParams],
  );

  function toggleId(key: FilterIdKey, id: number) {
    if (!catalog || applying) return;
    const current = effectiveFilterState[key];
    const nextIds = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];
    pushCatalogToUrl({
      sourceIds: effectiveFilterState.sourceIds,
      serviceLineIds: effectiveFilterState.serviceLineIds,
      regionIds: effectiveFilterState.regionIds,
      countryIds: effectiveFilterState.countryIds,
      [key]: nextIds,
    });
  }

  const removeChip = useCallback(
    (chip: FilterChip) => {
      if (!catalog || applying) return;
      const current = effectiveFilterState[chip.key];
      pushCatalogToUrl({
        sourceIds: effectiveFilterState.sourceIds,
        serviceLineIds: effectiveFilterState.serviceLineIds,
        regionIds: effectiveFilterState.regionIds,
        countryIds: effectiveFilterState.countryIds,
        [chip.key]: current.filter((value) => value !== chip.valueId),
      });
    },
    [catalog, applying, effectiveFilterState, pushCatalogToUrl],
  );

  const clearAllFilters = useCallback(() => {
    setClearing(true);
    setOptimisticCatalog({
      sourceIds: [],
      serviceLineIds: [],
      regionIds: [],
      countryIds: [],
    });
    const params = new URLSearchParams(searchParams.toString());
    writeEmptyCatalogFiltersToSearchParams(params);
    params.set("page", "1");
    const href = `/?${params.toString()}`;
    startTransition(() => {
      router.push(href);
    });
  }, [router, searchParams]);

  useEffect(() => {
    if (!isPending) setClearing(false);
  }, [isPending]);

  const reloadDefaults = useCallback(() => loadCatalog({ silent: true }), [
    loadCatalog,
  ]);

  useEffect(() => {
    registerActions({
      removeChip,
      clearAll: clearAllFilters,
      reloadDefaults,
    });
  }, [registerActions, removeChip, clearAllFilters, reloadDefaults]);

  const filteredServiceLines = useMemo(() => {
    if (!catalog) return [];
    const q = serviceLineQuery.trim().toLowerCase();
    if (!q) return catalog.serviceLines;
    return catalog.serviceLines.filter((line) =>
      line.name.toLowerCase().includes(q),
    );
  }, [catalog, serviceLineQuery]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        <p className="text-sm">Loading filters…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-4">
        <ApiErrorAlert error={loadError} />
      </div>
    );
  }

  if (!catalog) return null;

  const { role } = catalog;
  const filterState = effectiveFilterState;
  const manageSources =
    catalog.permissions?.manageSources ??
    hasPermission(role, "sources:update");
  const manageServiceLines =
    catalog.permissions?.manageServiceLines ??
    hasPermission(role, "service_lines:delete");
  const archivedSources = catalog.archivedSources ?? [];
  const archivedServiceLines = catalog.archivedServiceLines ?? [];
  const activeCount = countSidebarFilters(filterState);
  const filtersActive = hasSidebarFilters(filterState);
  const chipCatalog = catalogWithState(catalog, filterState);

  return (
    <div className={cn("space-y-4", className)} aria-busy={applying}>
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl border p-4 transition-colors duration-300",
          applying
            ? "border-blue-300 bg-gradient-to-br from-blue-100 via-white to-sky-50 dark:border-blue-400/40 dark:from-blue-950/60 dark:via-slate-900 dark:to-sky-950/40"
            : justApplied
              ? "border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-teal-50 dark:border-emerald-400/40 dark:from-emerald-950/40 dark:via-slate-900 dark:to-teal-950/30"
              : "border-blue-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:border-blue-500/20 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30",
        )}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-blue-400/20 blur-2xl" />
        <div className="relative mb-3 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg transition-colors",
                applying
                  ? "bg-blue-600 shadow-blue-600/30"
                  : justApplied
                    ? "bg-emerald-600 shadow-emerald-600/25"
                    : "bg-blue-600 shadow-blue-600/25",
              )}
            >
              {applying ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : justApplied ? (
                <Check className="h-4 w-4" aria-hidden />
              ) : (
                <Filter className="h-4 w-4" aria-hidden />
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                Refine {lexicon.opportunityPlural.toLowerCase()}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {applying
                  ? "Updating your results…"
                  : justApplied
                    ? "Filters applied"
                    : filtersActive
                      ? `${activeCount} active filter${activeCount === 1 ? "" : "s"}`
                      : `Showing all ${lexicon.opportunityPlural.toLowerCase()}`}
              </p>
            </div>
          </div>
          {filtersActive && (
            <button
              type="button"
              disabled={clearing || applying}
              onClick={() => clearAllFilters()}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-red-400/30 dark:hover:bg-red-500/10 dark:hover:text-red-200"
            >
              {clearing || applying ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RotateCcw className="h-3.5 w-3.5" />
              )}
              Clear all
            </button>
          )}
        </div>

        {applying && (
          <div
            className="relative mb-3 flex items-center gap-2.5 rounded-xl border border-blue-200/80 bg-white/90 px-3 py-2.5 text-xs font-medium text-blue-800 shadow-sm dark:border-blue-400/30 dark:bg-blue-950/50 dark:text-blue-100"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-600 dark:text-blue-300" />
            <span>
              Applying filters — refreshing{" "}
              {lexicon.opportunityPlural.toLowerCase()}
            </span>
            <span className="ml-auto flex gap-1" aria-hidden>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500 [animation-delay:300ms]" />
            </span>
          </div>
        )}

        {!filtersActive && !applying ? (
          <div className="relative flex items-center gap-2 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-800 dark:text-emerald-200">
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Empty selection shows every {lexicon.source.toLowerCase()},{" "}
            {lexicon.category.toLowerCase()}, and {lexicon.region.toLowerCase()}
          </div>
        ) : filtersActive ? (
          <div
            className={cn(
              "relative flex flex-wrap gap-1.5 transition-opacity",
              applying && "opacity-80",
            )}
          >
            {buildFilterChips(chipCatalog).map((chip) => (
              <button
                key={chip.id}
                type="button"
                disabled={applying}
                onClick={() => removeChip(chip)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
              >
                {chip.color && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: chip.color }}
                  />
                )}
                <span className="truncate">{chip.label}</span>
                <X className="h-3 w-3 shrink-0 opacity-50" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div
        className={cn(
          "space-y-3 transition-opacity duration-200",
          applying && "opacity-70",
        )}
      >
        {showSources && (
          <FilterAccordion
            title={lexicon.sourcePlural}
            icon={<Sparkles className="h-4 w-4" />}
            count={catalog.sources.length}
            activeCount={filterState.sourceIds.length}
            defaultOpen
            canAdd={canCreateSources(role)}
            onAdd={() => setSourceDialogOpen(true)}
            addButtonDataAttr="add-source"
          >
            <ul className="space-y-0.5">
              {catalog.sources.map((source) => (
                <li key={source.id}>
                  <FilterOptionRow
                    checked={filterState.sourceIds.includes(source.id)}
                    onToggle={() => toggleId("sourceIds", source.id)}
                    accentColor={source.color}
                    label={source.name}
                    disabled={applying}
                    actions={
                      manageSources ? (
                        <CatalogItemMenu
                          kind="source"
                          itemId={source.id}
                          itemName={source.name}
                          isBuiltIn={source.isBuiltIn}
                          onChanged={loadCatalog}
                        />
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </ul>
            {manageSources && archivedSources.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2 dark:border-white/[0.06]">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Archived ({archivedSources.length})
                </p>
                <ul className="space-y-0.5">
                  {archivedSources.map((source) => (
                    <li key={source.id}>
                      <div className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-500">
                        <span className="min-w-0 truncate">{source.name}</span>
                        <CatalogItemMenu
                          kind="source"
                          itemId={source.id}
                          itemName={source.name}
                          isBuiltIn={source.isBuiltIn}
                          archived
                          onChanged={loadCatalog}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </FilterAccordion>
        )}

        {showCategories && (
          <FilterAccordion
            title={categoryLabel}
            icon={<Search className="h-4 w-4" />}
            count={catalog.serviceLines.length}
            activeCount={filterState.serviceLineIds.length}
            canAdd={hasPermission(role, "service_lines:create")}
            onAdd={() => setServiceLineDialogOpen(true)}
          >
            {catalog.serviceLines.length > 8 && (
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
                <input
                  type="search"
                  value={serviceLineQuery}
                  onChange={(e) => setServiceLineQuery(e.target.value)}
                  placeholder={`Search ${categoryLabel.toLowerCase()}…`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-9 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-white/10 dark:bg-black/20 dark:text-slate-100"
                />
                {serviceLineQuery && (
                  <button
                    type="button"
                    onClick={() => setServiceLineQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
            <ul className="space-y-0.5">
              {filteredServiceLines.map((line) => (
                <li key={line.id}>
                  <FilterOptionRow
                    checked={filterState.serviceLineIds.includes(line.id)}
                    onToggle={() => toggleId("serviceLineIds", line.id)}
                    label={line.name}
                    disabled={applying}
                    actions={
                      manageServiceLines ? (
                        <CatalogItemMenu
                          kind="service-line"
                          itemId={line.id}
                          itemName={line.name}
                          isBuiltIn={line.isBuiltIn}
                          onChanged={loadCatalog}
                        />
                      ) : undefined
                    }
                  />
                </li>
              ))}
              {filteredServiceLines.length === 0 && (
                <p className="px-2 py-4 text-center text-xs text-slate-500">
                  No {categoryLabel.toLowerCase()} match your search
                </p>
              )}
            </ul>
            {manageServiceLines && archivedServiceLines.length > 0 && (
              <div className="mt-3 border-t border-slate-100 pt-2 dark:border-white/[0.06]">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Archived ({archivedServiceLines.length})
                </p>
                <ul className="space-y-0.5">
                  {archivedServiceLines.map((line) => (
                    <li key={line.id}>
                      <div className="flex items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-500">
                        <span className="min-w-0 truncate">{line.name}</span>
                        <CatalogItemMenu
                          kind="service-line"
                          itemId={line.id}
                          itemName={line.name}
                          isBuiltIn={line.isBuiltIn}
                          archived
                          onChanged={loadCatalog}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </FilterAccordion>
        )}

        {showRegions && (
          <FilterAccordion
            title={`${lexicon.region}s`}
            icon={<MapPin className="h-4 w-4" />}
            count={catalog.regions.length}
            activeCount={
              filterState.regionIds.length + filterState.countryIds.length
            }
            canAdd={hasPermission(role, "regions:create")}
            onAdd={() => setRegionDialogOpen(true)}
          >
            <ul className="space-y-1">
              {catalog.regions.map((region) => {
                const regionCountries = catalog.countries.filter(
                  (c) => c.regionId === region.id,
                );
                const expanded = expandedRegions[region.id] ?? false;

                return (
                  <li
                    key={region.id}
                    className="rounded-xl bg-slate-50/80 dark:bg-black/20"
                  >
                    <div className="flex items-start gap-1 p-1">
                      {regionCountries.length > 0 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedRegions((prev) => ({
                              ...prev,
                              [region.id]: !expanded,
                            }))
                          }
                          className="mt-2.5 rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700 dark:hover:bg-white/10 dark:hover:text-slate-200"
                          aria-label={expanded ? "Collapse" : "Expand"}
                          aria-expanded={expanded}
                        >
                          <ChevronDown
                            className={cn(
                              "h-4 w-4 transition-transform",
                              !expanded && "-rotate-90",
                            )}
                          />
                        </button>
                      ) : (
                        <span className="w-6" />
                      )}
                      <div className="min-w-0 flex-1">
                        <FilterOptionRow
                          checked={filterState.regionIds.includes(region.id)}
                          onToggle={() => toggleId("regionIds", region.id)}
                          label={region.name}
                          disabled={applying}
                          subLabel={
                            regionCountries.length > 0
                              ? `${regionCountries.length} countries`
                              : undefined
                          }
                        />
                      </div>
                    </div>
                    {expanded && regionCountries.length > 0 && (
                      <ul className="space-y-0.5 border-t border-slate-200/70 px-2 pb-2 pt-1 dark:border-white/[0.06]">
                        {regionCountries.map((country) => (
                          <li key={country.id}>
                            <FilterOptionRow
                              checked={filterState.countryIds.includes(
                                country.id,
                              )}
                              onToggle={() =>
                                toggleId("countryIds", country.id)
                              }
                              label={country.name}
                              disabled={applying}
                            />
                          </li>
                        ))}
                        {hasPermission(role, "countries:create") && (
                          <li>
                            <button
                              type="button"
                              onClick={() => setCountryDialogOpen(true)}
                              className="flex w-full items-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-blue-500/10"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Add country
                            </button>
                          </li>
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </FilterAccordion>
        )}
      </div>

      <AddSourceDialog
        open={sourceDialogOpen}
        onOpenChange={setSourceDialogOpen}
        onCreated={loadCatalog}
      />
      <AddCatalogDialog
        open={serviceLineDialogOpen}
        onOpenChange={setServiceLineDialogOpen}
        kind="service-line"
        onCreated={loadCatalog}
      />
      <AddCatalogDialog
        open={regionDialogOpen}
        onOpenChange={setRegionDialogOpen}
        kind="region"
        onCreated={loadCatalog}
      />
      <AddCatalogDialog
        open={countryDialogOpen}
        onOpenChange={setCountryDialogOpen}
        kind="country"
        regions={catalog.regions}
        onCreated={loadCatalog}
      />
    </div>
  );
}

/** @deprecated Use OpportunityFilters in the filter drawer */
export function SidebarFilters() {
  return <OpportunityFilters />;
}
