"use client";

import { Check, Loader2 } from "lucide-react";

import { useFilterWorkspace } from "@/components/filters/filter-workspace-context";
import { useLexicon } from "@/components/providers/org-context-provider";
import { cn } from "@/lib/utils";

export function FilterResultsOverlay({
  className,
}: {
  className?: string;
}) {
  const { applying, justApplied } = useFilterWorkspace();
  const { lexicon } = useLexicon();
  const visible = applying || justApplied;

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-10 flex items-start justify-center rounded-2xl transition-opacity duration-300",
        visible ? "opacity-100" : "opacity-0",
        className,
      )}
      aria-hidden={!visible}
      aria-busy={applying}
    >
      <div
        className={cn(
          "absolute inset-0 rounded-2xl backdrop-blur-[1px] transition-colors",
          applying
            ? "bg-slate-50/70 dark:bg-background/70"
            : "bg-emerald-50/40 dark:bg-emerald-950/20",
        )}
      />
      <div
        className={cn(
          "relative mt-10 inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-lg",
          applying
            ? "border-slate-200 bg-white text-slate-700 dark:border-border dark:bg-card dark:text-slate-100"
            : "border-emerald-200 bg-white text-emerald-800 dark:border-emerald-400/30 dark:bg-card dark:text-emerald-100",
        )}
        role="status"
        aria-live="polite"
      >
        {applying ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            Updating {lexicon.opportunityPlural.toLowerCase()}…
          </>
        ) : (
          <>
            <Check className="h-4 w-4 text-emerald-600" />
            Filters applied
          </>
        )}
      </div>
    </div>
  );
}
