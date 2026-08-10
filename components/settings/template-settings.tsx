"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Layers,
  Loader2,
  RefreshCw,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type {
  WorkspaceFeaturesSettings,
  WorkspaceLayoutSettings,
} from "@/lib/db/schema";

type TemplatePayload = {
  orgTemplateId: string;
  orgTemplateVersion: string;
  template: {
    id: string;
    version: string;
    name: string;
    description: string;
  };
  features: WorkspaceFeaturesSettings;
  layout: WorkspaceLayoutSettings;
};

const REAPPLY_SECTIONS = [
  {
    id: "lexicon" as const,
    label: "Terminology",
    description: "Reset product labels to template defaults",
  },
  {
    id: "branding" as const,
    label: "Branding",
    description: "Reset colors to template defaults",
  },
  {
    id: "features" as const,
    label: "Feature flags",
    description: "Restore enabled modules from template",
  },
  {
    id: "layout" as const,
    label: "Layout",
    description: "Restore sidebar sections and card variant",
  },
  {
    id: "catalog" as const,
    label: "Catalog seed",
    description: "Add built-in categories/regions if missing (non-destructive)",
  },
];

const FEATURE_LABELS: Record<keyof WorkspaceFeaturesSettings, string> = {
  analytics: "Analytics dashboard",
  publicShare: "Public share links",
  sync: "Source sync",
  matchScore: "Match scoring",
  export: "CSV export",
};

export function TemplateSettings() {
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [data, setData] = useState<TemplatePayload | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/template");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load template settings");
      }
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function reapplySection(section: (typeof REAPPLY_SECTIONS)[number]["id"]) {
    setApplying(section);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: [section] }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to reapply template section");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reapply");
    } finally {
      setApplying(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading template settings…
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-300">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Workspace template</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your organization was provisioned from a vertical template. Reapply
              sections to restore defaults without affecting tenant data.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{data.template.name}</p>
            <Badge variant="secondary">v{data.orgTemplateVersion}</Badge>
            <Badge variant="outline">{data.orgTemplateId}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.template.description}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            Card variant:{" "}
            <span className="font-medium text-foreground">
              {data.layout.homeCardVariant}
            </span>
            {" · "}
            Sidebar:{" "}
            <span className="font-medium text-foreground">
              {data.layout.sidebarSections.join(", ")}
            </span>
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Enabled features
        </h3>
        <ul className="space-y-3">
          {(Object.keys(FEATURE_LABELS) as Array<keyof WorkspaceFeaturesSettings>).map(
            (key) => (
              <li
                key={key}
                className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-4 py-3 dark:border-border/60"
              >
                <span className="text-sm">{FEATURE_LABELS[key]}</span>
                <Switch checked={data.features[key]} disabled aria-readonly />
              </li>
            ),
          )}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Feature toggles come from the template. Use reapply below to restore
          template defaults after manual experiments.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Reapply template sections
        </h3>
        <ul className="space-y-3">
          {REAPPLY_SECTIONS.map((section) => (
            <li
              key={section.id}
              className="flex flex-col gap-3 rounded-lg border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-border/60"
            >
              <div>
                <p className="text-sm font-medium">{section.label}</p>
                <p className="text-xs text-muted-foreground">
                  {section.description}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={applying !== null}
                onClick={() => void reapplySection(section.id)}
              >
                {applying === section.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Reapply
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      {saved && (
        <p className="flex items-center gap-1.5 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" />
          Template section reapplied — refreshing…
        </p>
      )}
    </div>
  );
}
