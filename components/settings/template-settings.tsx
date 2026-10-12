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
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import type {
  WorkspaceFeaturesSettings,
  WorkspaceLayoutSettings,
} from "@/lib/db/schema";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type TemplateSummary = {
  id: string;
  version: string;
  name: string;
  description: string;
};

type TemplatePayload = {
  orgTemplateId: string;
  orgTemplateVersion: string;
  template: TemplateSummary;
  availableTemplates?: TemplateSummary[];
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
  const [switching, setSwitching] = useState<string | null>(null);
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

  async function switchTemplate(templateId: string) {
    if (!data || templateId === data.orgTemplateId || switching) return;
    setSwitching(templateId);
    setError(null);
    try {
      const response = await fetch("/api/settings/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to switch template",
        );
      }
      showSuccessToast(
        `Switched to ${payload.switched?.templateName ?? templateId}`,
      );
      window.location.reload();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Switch failed";
      setError(message);
      showErrorToast(message);
    } finally {
      setSwitching(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  if (!data) return null;

  const available = data.availableTemplates ?? [];

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        icon={Layers}
        title="Workspace template"
        description="Choose how this workspace speaks and looks — same data pipeline, different labels and cards."
        tone="indigo"
        actions={
          saved ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Applied
            </span>
          ) : undefined
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
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

        {available.length > 0 && (
          <div className="mt-5 space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Switch vertical
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {available.map((template) => {
                const active = template.id === data.orgTemplateId;
                return (
                  <button
                    key={template.id}
                    type="button"
                    disabled={switching !== null}
                    onClick={() => void switchTemplate(template.id)}
                    className={cn(
                      "rounded-xl border p-4 text-left transition-colors",
                      active
                        ? "border-indigo-300 bg-indigo-50/80 dark:border-indigo-800 dark:bg-indigo-950/30"
                        : "border-slate-200 hover:border-slate-300 dark:border-border dark:hover:border-border",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{template.name}</p>
                      {active ? (
                        <Badge variant="secondary">Active</Badge>
                      ) : switching === template.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Switch
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {template.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
                disabled={applying !== null || switching !== null}
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
