"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { useOrg } from "@/components/providers/org-context-provider";
import { Button } from "@/components/ui/button";

export function TrialBanner() {
  const { commercial } = useOrg();

  if (!commercial.showTrialBanner) return null;

  const expired = commercial.status === "trial_expired";
  const days = commercial.trialDaysRemaining;

  return (
    <div
      className={
        expired
          ? "border-b border-amber-300 bg-amber-50 px-4 py-2.5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-b border-blue-200 bg-blue-50 px-4 py-2.5 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100"
      }
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {expired ? (
              <>
                Your free trial has ended. Sync and new sources are paused until
                you upgrade.
              </>
            ) : days === 0 ? (
              <>Your trial ends today. Upgrade to keep syncing without interruption.</>
            ) : (
              <>
                Trial: {days} day{days === 1 ? "" : "s"} remaining on the{" "}
                {commercial.plan} plan.
              </>
            )}
          </p>
        </div>
        <Button asChild size="sm" variant={expired ? "default" : "outline"}>
          <Link href="/settings/plan">View plan & upgrade</Link>
        </Button>
      </div>
    </div>
  );
}
