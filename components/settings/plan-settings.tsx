"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Loader2,
  RefreshCw,
  Users,
  Database,
} from "lucide-react";

import { ApiErrorAlert } from "@/components/ui/api-error-alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { readApiError, type ParsedClientError } from "@/lib/api/client-error";
import { cn } from "@/lib/utils";

type PlanPayload = {
  organization: {
    name: string;
    slug: string;
    status: string;
    plan: string;
    trialEndsAt: string | null;
    maxSeats: number;
    maxSources: number;
    syncIntervalHours: number;
  };
  plan: {
    id: string;
    label: string;
    priceHint?: string;
  };
  usage: {
    seats: number;
    sources: number;
  };
  trialDaysRemaining: number | null;
  canSync: boolean;
  canAddSeats: boolean;
  canAddSources: boolean;
  availablePlans: Array<{
    id: string;
    label: string;
    maxSeats: number;
    maxSources: number;
    syncIntervalHours: number;
    priceHint?: string;
  }>;
  billing: {
    stripeConfigured: boolean;
    hasSubscription: boolean;
  };
};

function usagePercent(used: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((used / max) * 100));
}

export function PlanSettings() {
  const [data, setData] = useState<PlanPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ParsedClientError | null>(null);
  const [checkoutError, setCheckoutError] = useState<ParsedClientError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/plan");
      if (!response.ok) {
        setError(await readApiError(response, "Failed to load plan"));
        return;
      }
      const payload = await response.json();
      setData(payload);
    } catch {
      setError({ message: "Failed to load plan — check your connection" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function startCheckout() {
    setCheckoutError(null);
    const response = await fetch("/api/billing/checkout", { method: "POST" });
    if (response.ok) return;
    setCheckoutError(await readApiError(response, "Checkout unavailable"));
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-14 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
          <div className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
          <div className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <ApiErrorAlert
        error={error ?? { message: "Unable to load plan details" }}
      />
    );
  }

  const seatPct = usagePercent(data.usage.seats, data.organization.maxSeats);
  const sourcePct = usagePercent(data.usage.sources, data.organization.maxSources);

  return (
    <div className="space-y-6">
      <SettingsPageHeader
        icon={CreditCard}
        title="Plan & usage"
        description={`Current plan for ${data.organization.name}`}
        tone="emerald"
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary" className="capitalize">
              {data.plan.label}
            </Badge>
            <Badge
              variant={data.organization.status === "active" ? "outline" : "secondary"}
              className={cn(
                "capitalize",
                data.organization.status !== "active" &&
                  "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
              )}
            >
              {data.organization.status.replace("_", " ")}
            </Badge>
          </div>
        }
      />

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">

        {data.trialDaysRemaining != null && data.organization.plan === "trial" && (
          <p className="rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
            {data.organization.status === "trial_expired"
              ? "Your trial has expired. Upgrade to restore sync and add sources."
              : data.trialDaysRemaining === 0
                ? "Your trial ends today."
                : `${data.trialDaysRemaining} day${data.trialDaysRemaining === 1 ? "" : "s"} left in your trial.`}
          </p>
        )}

        <div className={cn("grid gap-4 sm:grid-cols-3", data.trialDaysRemaining != null && data.organization.plan === "trial" ? "mt-6" : "")}>
          <UsageCard
            icon={Users}
            label="Team seats"
            used={data.usage.seats}
            max={data.organization.maxSeats}
            percent={seatPct}
            ok={data.canAddSeats}
          />
          <UsageCard
            icon={Database}
            label="Sources"
            used={data.usage.sources}
            max={data.organization.maxSources}
            percent={sourcePct}
            ok={data.canAddSources}
          />
          <UsageCard
            icon={RefreshCw}
            label="Sync cadence"
            usedLabel={
              data.canSync
                ? `Every ${data.organization.syncIntervalHours}h`
                : "Paused"
            }
            maxLabel={data.canSync ? "Cron + manual" : "Upgrade required"}
            percent={data.canSync ? 100 : 0}
            ok={data.canSync}
          />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button onClick={() => void startCheckout()}>
            <CreditCard className="h-4 w-4" />
            Upgrade plan
          </Button>
          <Button variant="outline" onClick={() => void load()}>
            Refresh usage
          </Button>
        </div>

        {checkoutError && (
          <ApiErrorAlert
            error={{
              ...checkoutError,
              contact:
                checkoutError.contact ??
                "mailto:support@globeconcs.com?subject=GlobeTender%20Cloud%20upgrade",
            }}
            className="mt-4"
            onDismiss={() => setCheckoutError(null)}
          />
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
        <h3 className="font-semibold">Available plans</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {data.availablePlans.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-slate-200 p-4 dark:border-border"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{plan.label}</span>
                {plan.id === data.organization.plan && (
                  <Badge variant="outline">Current</Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {plan.maxSeats} seats · {plan.maxSources} sources · sync every{" "}
                {plan.syncIntervalHours}h
              </p>
              {plan.priceHint && (
                <p className="mt-1 text-xs text-muted-foreground">{plan.priceHint}</p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Paid upgrades are handled manually until Stripe checkout is enabled. Contact{" "}
          <Link href="mailto:support@globeconcs.com" className="underline">
            support@globeconcs.com
          </Link>{" "}
          to move to Starter, Pro, or Enterprise.
        </p>
      </div>
    </div>
  );
}

function UsageCard({
  icon: Icon,
  label,
  used,
  max,
  usedLabel,
  maxLabel,
  percent,
  ok,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  used?: number;
  max?: number;
  usedLabel?: string;
  maxLabel?: string;
  percent: number;
  ok: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 dark:border-border dark:bg-muted/20">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Icon className="h-4 w-4 text-muted-foreground" />
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums">
        {usedLabel ?? `${used}/${max}`}
      </p>
      <p className="text-xs text-muted-foreground">
        {maxLabel ?? (ok ? "Within limit" : "Limit reached")}
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
        <div
          className={ok ? "h-full bg-blue-500" : "h-full bg-amber-500"}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
