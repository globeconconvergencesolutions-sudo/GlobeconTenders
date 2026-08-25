"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Languages, Loader2, RotateCcw } from "lucide-react";

import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkspaceLexiconSettings } from "@/lib/db/schema";
import { DEFAULT_PROCUREMENT_LEXICON } from "@/lib/lexicon";

const LEXICON_GROUPS: Array<{
  title: string;
  keys: (keyof WorkspaceLexiconSettings)[];
}> = [
  {
    title: "Core entities",
    keys: [
      "opportunity",
      "opportunityPlural",
      "source",
      "sourcePlural",
      "category",
      "categoryPlural",
    ],
  },
  {
    title: "Fields",
    keys: ["deadline", "matchScore", "region", "country"],
  },
  {
    title: "Actions",
    keys: ["save", "export", "share", "sync"],
  },
  {
    title: "Navigation",
    keys: [
      "navHome",
      "navAnalytics",
      "navProfile",
      "navSettings",
      "navTeam",
    ],
  },
  {
    title: "Empty states & product",
    keys: ["emptyOpportunities", "emptyOpportunitiesHint", "productTagline"],
  },
];

const FIELD_LABELS: Record<keyof WorkspaceLexiconSettings, string> = {
  opportunity: "Opportunity (singular)",
  opportunityPlural: "Opportunity (plural)",
  source: "Source (singular)",
  sourcePlural: "Source (plural)",
  category: "Category (singular)",
  categoryPlural: "Category (plural)",
  deadline: "Deadline label",
  matchScore: "Match score label",
  region: "Region label",
  country: "Country label",
  save: "Save action",
  export: "Export action",
  share: "Share action",
  sync: "Sync action",
  navHome: "Home nav label",
  navAnalytics: "Analytics nav label",
  navProfile: "Profile nav label",
  navSettings: "Settings nav label",
  navTeam: "Team nav label",
  emptyOpportunities: "Empty state title",
  emptyOpportunitiesHint: "Empty state hint",
  productTagline: "Product tagline",
};

export function LexiconSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [lexicon, setLexicon] = useState<WorkspaceLexiconSettings>(
    DEFAULT_PROCUREMENT_LEXICON,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/lexicon");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load terminology");
      }
      setLexicon(payload.lexicon);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/lexicon", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lexicon),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save terminology");
      }
      setLexicon(payload.lexicon);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function resetToDefaults() {
    setLexicon({ ...DEFAULT_PROCUREMENT_LEXICON });
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <SettingsPageHeader
        icon={Languages}
        title="Terminology"
        description="Customize labels across the dashboard, emails, and share pages."
        tone="amber"
      />

      {/* Where labels appear */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-5 text-white shadow-sm dark:border-border">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Live label preview
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            lexicon.navHome,
            lexicon.navAnalytics,
            lexicon.navProfile,
            lexicon.navSettings,
            lexicon.navTeam,
          ].map((label) => (
            <span
              key={label}
              className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium ring-1 ring-white/10"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Entities
            </p>
            <p className="mt-1 text-sm font-semibold">
              {lexicon.opportunityPlural}
            </p>
            <p className="text-xs text-slate-400">
              from {lexicon.sourcePlural.toLowerCase()}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Actions
            </p>
            <p className="mt-1 text-sm font-semibold">
              {lexicon.sync} · {lexicon.export}
            </p>
            <p className="text-xs text-slate-400">
              {lexicon.save} / {lexicon.share}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-[10px] uppercase tracking-wide text-slate-400">
              Empty state
            </p>
            <p className="mt-1 text-sm font-semibold leading-snug">
              {lexicon.emptyOpportunities}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card sm:p-6">
        <div className="space-y-8">
          {LEXICON_GROUPS.map((group) => (
            <section key={group.title}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {group.title}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {group.keys.map((key) => (
                  <div key={key} className="space-y-2">
                    <Label htmlFor={key}>{FIELD_LABELS[key]}</Label>
                    <Input
                      id={key}
                      value={lexicon[key]}
                      onChange={(e) =>
                        setLexicon((prev) => ({
                          ...prev,
                          [key]: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save terminology"
          )}
        </Button>
        <Button type="button" variant="outline" onClick={resetToDefaults}>
          <RotateCcw className="h-4 w-4" />
          Reset to defaults
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
