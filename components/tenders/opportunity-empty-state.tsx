"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  Plus,
  RefreshCw,
  Search,
} from "lucide-react";

import { useLayout, useLexicon, useOrg } from "@/components/providers/org-context-provider";
import { Button } from "@/components/ui/button";

type OpportunityEmptyStateProps = {
  onAddSource?: () => void;
  onSync?: () => void;
  canSync: boolean;
  canAddSource: boolean;
};

export function OpportunityEmptyState({
  onAddSource,
  onSync,
  canSync,
  canAddSource,
}: OpportunityEmptyStateProps) {
  const { layout, template } = useOrg();
  const { t, lexicon } = useLexicon();
  const variant = layout.homeCardVariant ?? "procurement";

  const config =
    variant === "hr"
      ? {
          icon: Briefcase,
          title: "No jobs in your pipeline yet",
          hint: "Connect job boards and careers RSS feeds, then run a sync to populate your dashboard.",
          steps: [
            "Install a featured job board from the catalog",
            "Map departments to your hiring priorities",
            "Run sync to pull open roles",
          ],
          gradient: "from-violet-500/15 to-fuchsia-500/10",
          iconClass: "text-violet-500",
        }
      : {
          icon: Building2,
          title: t("emptyOpportunities"),
          hint: t("emptyOpportunitiesHint"),
          steps: [
            "Add World Bank, AfDB, or a custom RSS source",
            "Configure service lines and regions",
            "Sync to fetch matching tenders",
          ],
          gradient: "from-blue-500/15 to-indigo-500/10",
          iconClass: "text-blue-600",
        };

  const Icon = config.icon;

  return (
    <div className="overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white dark:border-border dark:bg-card">
      <div
        className={`bg-gradient-to-br ${config.gradient} px-6 py-10 text-center sm:px-10`}
      >
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-lg dark:bg-slate-900">
          <Icon className={`h-8 w-8 ${config.iconClass}`} />
        </div>
        <h3 className="mt-5 text-xl font-semibold tracking-tight">{config.title}</h3>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">{config.hint}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Template: {template.name}
        </p>
      </div>

      <div className="grid gap-6 px-6 py-8 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium">Quick start</p>
          <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
            {config.steps.map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold text-slate-400">{index + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col justify-center gap-3">
          {canAddSource && onAddSource && (
            <Button onClick={onAddSource} className="w-full justify-start" data-add-source-trigger>
              <Plus className="h-4 w-4" />
              Add {lexicon.source.toLowerCase()}
            </Button>
          )}
          {canSync && onSync && (
            <Button
              variant="outline"
              onClick={onSync}
              className="w-full justify-start"
              data-sync-trigger
            >
              <RefreshCw className="h-4 w-4" />
              Run {lexicon.sync.toLowerCase()}
            </Button>
          )}
          <Button asChild variant="ghost" className="w-full justify-start text-muted-foreground">
            <Link href="/analytics">
              <Search className="h-4 w-4" />
              Explore analytics
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
