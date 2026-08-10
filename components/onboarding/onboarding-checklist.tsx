"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Loader2,
  Rocket,
  Sparkles,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { OnboardingProgress } from "@/lib/onboarding/steps";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type OnboardingChecklistProps = {
  initialProgress: OnboardingProgress;
  canManage: boolean;
};

export function OnboardingChecklist({
  initialProgress,
  canManage,
}: OnboardingChecklistProps) {
  const router = useRouter();
  const [progress, setProgress] = useState(initialProgress);
  const [dismissing, setDismissing] = useState(false);

  const visible =
    canManage && !progress.dismissed && !progress.allComplete;

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/settings/onboarding");
      if (response.ok) {
        const data = await response.json();
        setProgress(data.progress);
      }
    } catch {
      // ignore background refresh
    }
  }, []);

  useEffect(() => {
    if (!visible) return;
    const interval = window.setInterval(() => void refresh(), 15000);
    return () => window.clearInterval(interval);
  }, [visible, refresh]);

  async function dismiss() {
    setDismissing(true);
    try {
      await fetch("/api/settings/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dismiss: true }),
      });
      setProgress((current) => ({ ...current, dismissed: true }));
      showSuccessToast("Getting started guide dismissed");
    } finally {
      setDismissing(false);
    }
  }

  if (!visible) return null;

  const pct = Math.round((progress.completedCount / progress.totalCount) * 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-blue-200/80 bg-gradient-to-br from-blue-50 via-white to-indigo-50 shadow-sm dark:border-blue-900/50 dark:from-blue-950/40 dark:via-slate-900 dark:to-indigo-950/30">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-blue-100/80 px-5 py-4 dark:border-blue-900/40">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
            <Rocket className="h-5 w-5" />
          </div>
          <div>
            <p className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              Getting started
              <Sparkles className="h-4 w-4 text-amber-500" />
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {progress.completedCount} of {progress.totalCount} complete — set up your
              workspace in a few minutes
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0 text-muted-foreground"
          onClick={() => void dismiss()}
          disabled={dismissing}
          aria-label="Dismiss checklist"
        >
          {dismissing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <X className="h-4 w-4" />
          )}
        </Button>
      </div>

      <div className="px-5 pt-4">
        <div className="h-2 overflow-hidden rounded-full bg-blue-100 dark:bg-blue-950">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 to-indigo-500 transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <ul className="divide-y divide-blue-100/80 dark:divide-blue-900/30">
        {progress.steps.map((step) => (
          <li key={step.id}>
            <div className="flex items-center gap-4 px-5 py-4">
              {step.completed ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-slate-300 dark:text-slate-600" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-medium",
                    step.completed && "text-muted-foreground line-through",
                  )}
                >
                  {step.title}
                </p>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
              {!step.completed && (
                <Button
                  asChild={step.action === "navigate"}
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  onClick={
                    step.action === "navigate"
                      ? undefined
                      : () => {
                          if (step.action === "sync") {
                            document
                              .querySelector<HTMLButtonElement>("[data-sync-trigger]")
                              ?.click();
                          } else if (step.action === "open_sources") {
                            router.push("/");
                            window.setTimeout(() => {
                              document
                                .querySelector<HTMLButtonElement>(
                                  "[data-add-source-trigger]",
                                )
                                ?.click();
                            }, 300);
                          }
                        }
                  }
                >
                  {step.action === "navigate" ? (
                    <Link href={step.href}>Go</Link>
                  ) : (
                    <span>{step.action === "sync" ? "Sync" : "Add source"}</span>
                  )}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
