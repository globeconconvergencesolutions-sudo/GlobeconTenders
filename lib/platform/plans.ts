export type PlanId = "trial" | "starter" | "pro" | "enterprise";

export type PlanDefinition = {
  id: PlanId;
  label: string;
  maxSeats: number;
  maxSources: number;
  syncIntervalHours: number;
  trialDays?: number;
  priceHint?: string;
};

export const PLAN_DEFINITIONS: Record<PlanId, PlanDefinition> = {
  trial: {
    id: "trial",
    label: "Trial",
    maxSeats: 5,
    maxSources: 5,
    syncIntervalHours: 24,
    trialDays: 14,
    priceHint: "Free for 14 days",
  },
  starter: {
    id: "starter",
    label: "Starter",
    maxSeats: 10,
    maxSources: 15,
    syncIntervalHours: 24,
    priceHint: "Contact sales",
  },
  pro: {
    id: "pro",
    label: "Pro",
    maxSeats: 25,
    maxSources: 50,
    syncIntervalHours: 1,
    priceHint: "Contact sales",
  },
  enterprise: {
    id: "enterprise",
    label: "Enterprise",
    maxSeats: 9999,
    maxSources: 9999,
    syncIntervalHours: 1,
    priceHint: "Custom",
  },
};

export const TRIAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000;

export function isPlanId(value: string): value is PlanId {
  return value in PLAN_DEFINITIONS;
}

export function getPlanDefinition(planId: string): PlanDefinition {
  if (isPlanId(planId)) return PLAN_DEFINITIONS[planId];
  return PLAN_DEFINITIONS.trial;
}

export function planLimitsFor(planId: string) {
  const plan = getPlanDefinition(planId);
  return {
    maxSeats: plan.maxSeats,
    maxSources: plan.maxSources,
    syncIntervalHours: plan.syncIntervalHours,
  };
}
