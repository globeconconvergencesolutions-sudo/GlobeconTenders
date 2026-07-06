"use client";

import { AlertCircle, CheckCircle2, Info } from "lucide-react";

import { cn } from "@/lib/utils";

export type SyncFeedbackResult = {
  sourceName: string;
  inserted: number;
  updated: number;
  errors: string[];
};

type SyncFeedbackBannerProps = {
  results: SyncFeedbackResult[];
  onDismiss: () => void;
};

export function SyncFeedbackBanner({
  results,
  onDismiss,
}: SyncFeedbackBannerProps) {
  const totalInserted = results.reduce((sum, r) => sum + r.inserted, 0);
  const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);
  const hasErrors = results.some((r) => r.errors.length > 0);
  const allFailed = results.every(
    (r) => r.errors.length > 0 && r.inserted === 0 && r.updated === 0,
  );

  const tone = allFailed ? "error" : hasErrors ? "warning" : "success";
  const Icon =
    tone === "success"
      ? CheckCircle2
      : tone === "warning"
        ? AlertCircle
        : AlertCircle;

  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border px-4 py-3 sm:px-5",
        tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100",
        tone === "warning" &&
          "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100",
        tone === "error" &&
          "border-red-200 bg-red-50 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium">
              {allFailed
                ? "Sync failed"
                : hasErrors
                  ? "Sync completed with warnings"
                  : "Sync completed successfully"}
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-medium opacity-70 transition-opacity hover:opacity-100"
            >
              Dismiss
            </button>
          </div>

          {!allFailed && (
            <p className="text-sm opacity-90">
              {totalInserted} new · {totalUpdated} updated across{" "}
              {results.length} source{results.length === 1 ? "" : "s"}
            </p>
          )}

          <ul className="space-y-1.5 text-sm">
            {results.map((result) => (
              <li
                key={result.sourceName}
                className="flex items-start gap-2 opacity-90"
              >
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  <span className="font-medium">{result.sourceName}</span>
                  {result.errors.length ? (
                    <> — {result.errors[0]}</>
                  ) : (
                    <>
                      {" "}
                      — {result.inserted} new, {result.updated} updated
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
