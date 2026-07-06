"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  Globe2,
  Loader2,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CatalogSource } from "@/lib/catalog/source-catalog";
import { cn } from "@/lib/utils";

type CatalogResponse = {
  catalog: CatalogSource[];
  installedIds: string[];
};

type InstallResult = {
  catalogId: string;
  status: "installed" | "exists" | "skipped" | "failed";
  sourceName?: string;
  sync?: { inserted: number; updated: number; errors: string[] };
  error?: string;
};

type SourceCatalogPanelProps = {
  onInstalled: () => void;
};

const regionFilters = ["All", "Kenya", "Africa", "Global"] as const;

function statusLabel(status: CatalogSource["status"]) {
  switch (status) {
    case "live":
      return "Live sync";
    case "beta":
      return "Beta";
    case "browse":
      return "Browse only";
  }
}

function statusClass(status: CatalogSource["status"]) {
  switch (status) {
    case "live":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
    case "beta":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
    case "browse":
      return "bg-slate-100 text-slate-700 dark:bg-muted dark:text-muted-foreground";
  }
}

export function SourceCatalogPanel({ onInstalled }: SourceCatalogPanelProps) {
  const [loading, setLoading] = useState(true);
  const [catalog, setCatalog] = useState<CatalogSource[]>([]);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [region, setRegion] =
    useState<(typeof regionFilters)[number]>("All");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sources/catalog");
      const data = (await response.json()) as CatalogResponse & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Failed to load catalog");
      setCatalog(data.catalog);
      setInstalledIds(new Set(data.installedIds));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  const filtered = useMemo(
    () =>
      catalog.filter(
        (source) => region === "All" || source.region === region,
      ),
    [catalog, region],
  );

  const liveCount = catalog.filter((source) => source.syncSupported).length;
  const installedLiveCount = catalog.filter(
    (source) => source.syncSupported && installedIds.has(source.id),
  ).length;

  async function installOne(catalogId: string) {
    setBusyId(catalogId);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch("/api/sources/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catalogId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Install failed");
      }

      const result = data.result as InstallResult;
      if (result.status === "installed") {
        const count = result.sync?.inserted ?? 0;
        setFeedback(
          `${result.sourceName} added${count ? ` — ${count} tenders synced` : ""}`,
        );
      } else if (result.status === "exists") {
        setFeedback(`${result.sourceName} is already in your sidebar`);
      } else if (result.status === "skipped") {
        setFeedback(result.error ?? "Source skipped");
      } else {
        throw new Error(result.error ?? "Install failed");
      }

      await loadCatalog();
      onInstalled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Install failed");
    } finally {
      setBusyId(null);
    }
  }

  async function installFeatured() {
    setBulkBusy(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch("/api/sources/install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ featured: true }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Bulk install failed");
      }

      const results = data.results as InstallResult[];
      const installed = results.filter((r) => r.status === "installed").length;
      const existing = results.filter((r) => r.status === "exists").length;
      setFeedback(
        `Featured sources ready — ${installed} added, ${existing} already installed`,
      );
      await loadCatalog();
      onInstalled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk install failed");
    } finally {
      setBulkBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-4 dark:border-blue-900/40 dark:from-blue-950/30 dark:via-card dark:to-violet-950/20 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-blue-600/10 px-3 py-1 text-xs font-semibold text-blue-700 dark:text-blue-200">
              <Sparkles className="h-3.5 w-3.5" />
              Popular tender portals
            </div>
            <h3 className="text-base font-semibold tracking-tight">
              One-click source catalog
            </h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Add the portals teams ask for most — World Bank, Kenya PPIP,
              Tender Yetu, AfDB, UNDP — with live URLs on every tender card.
            </p>
            <p className="mt-2 text-xs font-medium text-blue-700/80 dark:text-blue-200/80">
              {installedLiveCount} of {liveCount} live sources in your sidebar
            </p>
          </div>
          <Button
            className="shrink-0 bg-blue-600 hover:bg-blue-700"
            disabled={bulkBusy}
            onClick={installFeatured}
          >
            {bulkBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            Add all featured
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {regionFilters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setRegion(item)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              region === item
                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-muted dark:text-muted-foreground",
            )}
          >
            {item}
          </button>
        ))}
      </div>

      {feedback && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
          {feedback}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {filtered.map((source) => {
          const installed = installedIds.has(source.id);
          const isBusy = busyId === source.id;

          return (
            <div
              key={source.id}
              className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-border dark:bg-card"
            >
              <div
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: source.color }}
              />
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                      style={{ backgroundColor: source.color }}
                    >
                      {source.region}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        statusClass(source.status),
                      )}
                    >
                      {statusLabel(source.status)}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                      {source.category}
                    </span>
                  </div>
                  <h4 className="font-semibold leading-snug">{source.name}</h4>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                    {source.description}
                  </p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                  >
                    Visit portal
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {installed ? (
                  <div className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Added
                  </div>
                ) : source.syncSupported ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    disabled={isBusy}
                    onClick={() => installOne(source.id)}
                  >
                    {isBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add & sync
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="shrink-0"
                    asChild
                  >
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Browse
                    </a>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed px-6 py-10 text-center text-sm text-muted-foreground">
          <Globe2 className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No catalog sources in this region yet.
        </div>
      )}
    </div>
  );
}
