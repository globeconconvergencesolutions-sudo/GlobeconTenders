"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
import { ApiErrorAlert } from "@/components/ui/api-error-alert";
import { readApiError, type ParsedClientError } from "@/lib/api/client-error";
import { useLayout, useLexicon } from "@/components/providers/org-context-provider";
import { Checkbox } from "@/components/ui/checkbox";
import { canCreateSources, hasPermission } from "@/lib/auth/permissions";
import type { FilterState, UserRole } from "@/lib/db/schema";
import {
  countSidebarFilters,
  hasSidebarFilters,
} from "@/lib/filters/active-count";
import { layoutShowsSection } from "@/lib/templates/layout-utils";
import { cn } from "@/lib/utils";

type CatalogResponse = {
  sources: Array<{
    id: number;
    name: string;
    color: string;
    type: string;
    isBuiltIn?: boolean;
  }>;
  serviceLines: Array<{ id: number; name: string; isBuiltIn?: boolean }>;
  archivedSources: Array<{
    id: number;
    name: string;
    color: string;
    type: string;
    isBuiltIn?: boolean;
  }>;
  archivedServiceLines: Array<{ id: number; name: string; isBuiltIn?: boolean }>;
  regions: Array<{ id: number; name: string }>;
  countries: Array<{ id: number; name: string; regionId: number; regionName: string }>;
  filterState: FilterState;
  role: UserRole;
  permissions?: {
    manageSources: boolean;
    manageServiceLines: boolean;
  };
};

type FilterIdKey =
  | "sourceIds"
  | "serviceLineIds"
  | "regionIds"
  | "countryIds";

type FilterAccordionProps = {
  title: string;
  icon: React.ReactNode;
  count: number;
  activeCount: number;
  defaultOpen?: boolean;
  onAdd?: () => void;
  canAdd?: boolean;
  addButtonDataAttr?: string;
  children: React.ReactNode;
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
}: FilterAccordionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-white/[0.04]"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-slate-300">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-semibold text-slate-100">
            {title}
          </span>
          <span className="text-[10px] text-slate-500">
            {activeCount > 0
              ? `${activeCount} selected · ${count} total`
              : `${count} available`}
          </span>
        </span>
        {activeCount > 0 && (
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-200">
            {activeCount}
          </span>
        )}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-500 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-white/[0.06] px-2 py-2 pb-3">
          {canAdd && onAdd && (
            <button
              type="button"
              onClick={onAdd}
              data-add-source-trigger={addButtonDataAttr === "add-source" ? true : undefined}
              className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/10 px-2 py-1.5 text-[11px] font-medium text-slate-400 transition-colors hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-blue-200"
            >
              <Plus className="h-3 w-3" />
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
}: {
  checked: boolean;
  onToggle: () => void;
  accentColor?: string;
  label: string;
  subLabel?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "group flex w-full items-start gap-2 rounded-lg px-2 py-2 transition-all",
        checked
          ? "bg-blue-500/15 ring-1 ring-blue-400/30"
          : "hover:bg-white/[0.05]",
      )}
    >
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          className="mt-0.5 border-white/20 data-[state=checked]:border-blue-400 data-[state=checked]:bg-blue-500"
        />
        {accentColor && (
          <span
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full ring-2 ring-white/10"
            style={{ backgroundColor: accentColor }}
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-medium leading-snug text-slate-200">
            {label}
          </span>
          {subLabel && (
            <span className="mt-0.5 block text-[10px] text-slate-500">
              {subLabel}
            </span>
          )}
        </span>
      </label>
      {actions && (
        <div className="shrink-0 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 has-[[aria-expanded=true]]:opacity-100">
          {actions}
        </div>
      )}
    </div>
  );
}

export function SidebarFilters() {
  const router = useRouter();
  const layout = useLayout();
  const { lexicon } = useLexicon();
  const showSources = layoutShowsSection(layout, "sources");
  const showCategories =
    layoutShowsSection(layout, "serviceLines") ||
    layoutShowsSection(layout, "departments");
  const showRegions =
    layoutShowsSection(layout, "regions") ||
    layoutShowsSection(layout, "countries");
  const categoryLabel = lexicon.categoryPlural;
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [expandedRegions, setExpandedRegions] = useState<Record<number, boolean>>(
    {},
  );
  const [serviceLineQuery, setServiceLineQuery] = useState("");
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [serviceLineDialogOpen, setServiceLineDialogOpen] = useState(false);
  const [regionDialogOpen, setRegionDialogOpen] = useState(false);
  const [countryDialogOpen, setCountryDialogOpen] = useState(false);
  const [loadError, setLoadError] = useState<ParsedClientError | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/filters");
      if (!response.ok) {
        setLoadError(await readApiError(response, "Failed to load filters"));
        return;
      }
      const data = await response.json();
      setCatalog({
        ...data,
        archivedSources: data.archivedSources ?? [],
        archivedServiceLines: data.archivedServiceLines ?? [],
      });
    } catch {
      setLoadError({ message: "Failed to load filters — try refreshing" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  async function patchFilter(next: Partial<FilterState>) {
    if (!catalog) return;
    const response = await fetch("/api/filters", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    if (response.ok) {
      const data = await response.json();
      setCatalog({ ...catalog, filterState: data.filterState });
      router.refresh();
    }
  }

  function toggleId(key: FilterIdKey, id: number) {
    if (!catalog) return;
    const current = catalog.filterState[key];
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];
    patchFilter({ [key]: next });
  }

  async function clearAllFilters() {
    setClearing(true);
    try {
      const response = await fetch("/api/filters", { method: "DELETE" });
      if (response.ok) {
        const data = await response.json();
        if (catalog) {
          setCatalog({ ...catalog, filterState: data.filterState });
        }
        router.push("/");
        router.refresh();
      }
    } finally {
      setClearing(false);
    }
  }

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
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-3">
        <ApiErrorAlert error={loadError} />
      </div>
    );
  }

  if (!catalog) return null;

  const { filterState, role } = catalog;
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

  return (
    <>
      <div className="space-y-3">
        <div className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-blue-500/10 via-transparent to-violet-500/10 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 text-blue-200">
                <Filter className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Filters</p>
                <p className="text-[10px] text-slate-400">
                  {filtersActive
                    ? `${activeCount} active restriction${activeCount === 1 ? "" : "s"}`
                    : "Showing all tenders"}
                </p>
              </div>
            </div>
            {filtersActive && (
              <button
                type="button"
                disabled={clearing}
                onClick={clearAllFilters}
                className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold text-slate-200 transition-colors hover:bg-red-500/20 hover:text-red-100 disabled:opacity-50"
              >
                {clearing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <RotateCcw className="h-3 w-3" />
                )}
                Clear all
              </button>
            )}
          </div>

          {!filtersActive ? (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-2.5 py-2 text-[11px] text-emerald-200">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              Empty selection = all sources, lines & regions
            </div>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {filterState.sourceIds.length > 0 && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                  {filterState.sourceIds.length} source
                  {filterState.sourceIds.length === 1 ? "" : "s"}
                </span>
              )}
              {filterState.serviceLineIds.length > 0 && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                  {filterState.serviceLineIds.length} service line
                  {filterState.serviceLineIds.length === 1 ? "" : "s"}
                </span>
              )}
              {(filterState.regionIds.length > 0 ||
                filterState.countryIds.length > 0) && (
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-slate-300">
                  {filterState.regionIds.length + filterState.countryIds.length}{" "}
                  geo
                </span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-2">
          {showSources && (
          <FilterAccordion
            title={lexicon.sourcePlural}
            icon={<Sparkles className="h-3.5 w-3.5" />}
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
              <div className="mt-3 border-t border-white/[0.06] pt-2">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Archived ({archivedSources.length})
                </p>
                <ul className="space-y-0.5">
                  {archivedSources.map((source) => (
                    <li key={source.id}>
                      <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs text-slate-400">
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
            icon={<Search className="h-3.5 w-3.5" />}
            count={catalog.serviceLines.length}
            activeCount={filterState.serviceLineIds.length}
            canAdd={hasPermission(role, "service_lines:create")}
            onAdd={() => setServiceLineDialogOpen(true)}
          >
            {catalog.serviceLines.length > 8 && (
              <div className="relative mb-2">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={serviceLineQuery}
                  onChange={(e) => setServiceLineQuery(e.target.value)}
                  placeholder={`Search ${categoryLabel.toLowerCase()}...`}
                  className="w-full rounded-lg border border-white/10 bg-black/20 py-1.5 pl-8 pr-8 text-xs text-slate-200 placeholder:text-slate-500 focus:border-blue-400/50 focus:outline-none focus:ring-1 focus:ring-blue-400/30"
                />
                {serviceLineQuery && (
                  <button
                    type="button"
                    onClick={() => setServiceLineQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
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
                <p className="px-2 py-3 text-center text-[11px] text-slate-500">
                  No {categoryLabel.toLowerCase()} match your search
                </p>
              )}
            </ul>
            {manageServiceLines && archivedServiceLines.length > 0 && (
              <div className="mt-3 border-t border-white/[0.06] pt-2">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                  Archived ({archivedServiceLines.length})
                </p>
                <ul className="space-y-0.5">
                  {archivedServiceLines.map((line) => (
                    <li key={line.id}>
                      <div className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-xs text-slate-400">
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
            icon={<MapPin className="h-3.5 w-3.5" />}
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
                  <li key={region.id} className="rounded-lg bg-black/10">
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
                          className="mt-2 rounded p-0.5 text-slate-500 hover:text-slate-300"
                          aria-label={expanded ? "Collapse" : "Expand"}
                        >
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              !expanded && "-rotate-90",
                            )}
                          />
                        </button>
                      ) : (
                        <span className="w-5" />
                      )}
                      <div className="min-w-0 flex-1">
                        <FilterOptionRow
                          checked={filterState.regionIds.includes(region.id)}
                          onToggle={() => toggleId("regionIds", region.id)}
                          label={region.name}
                          subLabel={
                            regionCountries.length > 0
                              ? `${regionCountries.length} countries`
                              : undefined
                          }
                        />
                      </div>
                    </div>
                    {expanded && regionCountries.length > 0 && (
                      <ul className="space-y-0.5 border-t border-white/[0.05] px-2 pb-2 pt-1">
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
                            />
                          </li>
                        ))}
                        {hasPermission(role, "countries:create") && (
                          <li>
                            <button
                              type="button"
                              onClick={() => setCountryDialogOpen(true)}
                              className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-medium text-blue-300 hover:bg-blue-500/10"
                            >
                              <Plus className="h-3 w-3" />
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
    </>
  );
}
