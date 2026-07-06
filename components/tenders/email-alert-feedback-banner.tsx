"use client";

import { CheckCircle2, Mail, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type EmailAlertFeedback = {
  sent: number;
  skipped: number;
  failed: number;
  processed?: number;
  results?: Array<{
    email: string;
    status: "sent" | "skipped" | "failed";
    closingCount?: number;
    highMatchCount?: number;
    error?: string;
  }>;
};

type EmailAlertFeedbackBannerProps = {
  alerts: EmailAlertFeedback;
  onDismiss: () => void;
};

export function EmailAlertFeedbackBanner({
  alerts,
  onDismiss,
}: EmailAlertFeedbackBannerProps) {
  const tone =
    alerts.failed > 0 ? "error" : alerts.sent > 0 ? "success" : "neutral";
  const Icon =
    tone === "error" ? XCircle : tone === "success" ? CheckCircle2 : Mail;

  return (
    <div
      role="status"
      className={cn(
        "rounded-xl border px-4 py-3 sm:px-5",
        tone === "success" &&
          "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-100",
        tone === "error" &&
          "border-red-200 bg-red-50 text-red-950 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100",
        tone === "neutral" &&
          "border-slate-200 bg-slate-50 text-slate-800 dark:border-border dark:bg-muted/30 dark:text-slate-200",
      )}
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="font-medium">
              {alerts.failed > 0
                ? "Email alerts had failures"
                : alerts.sent > 0
                  ? "Email alerts sent"
                  : "Email alerts skipped"}
            </p>
            <button
              type="button"
              onClick={onDismiss}
              className="text-xs font-medium opacity-70 transition-opacity hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
          <p className="text-sm opacity-90">
            {alerts.sent} sent · {alerts.skipped} skipped · {alerts.failed}{" "}
            failed
          </p>
          {alerts.results?.map((row) =>
            row.status === "failed" && row.error ? (
              <p key={row.email} className="text-xs text-red-700 dark:text-red-200">
                {row.email}: {row.error}
              </p>
            ) : row.status === "sent" ? (
              <p key={row.email} className="text-xs opacity-80">
                {row.email} — {row.closingCount ?? 0} closing,{" "}
                {row.highMatchCount ?? 0} high match
              </p>
            ) : null,
          )}
        </div>
      </div>
    </div>
  );
}
