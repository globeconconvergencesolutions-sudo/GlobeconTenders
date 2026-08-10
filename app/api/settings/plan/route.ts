import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/errors";
import { requireSettingsManage } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";
import { getOrgPlanSummary } from "@/lib/platform/limits";
import { PLAN_DEFINITIONS } from "@/lib/platform/plans";

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);
    const summary = await getOrgPlanSummary(user.orgId);
    if (!summary) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        name: summary.organization.name,
        slug: summary.organization.slug,
        status: summary.organization.status,
        plan: summary.organization.plan,
        trialEndsAt: summary.organization.trialEndsAt?.toISOString() ?? null,
        maxSeats: summary.organization.maxSeats,
        maxSources: summary.organization.maxSources,
        syncIntervalHours: summary.organization.syncIntervalHours,
      },
      plan: summary.plan,
      usage: summary.usage,
      trialDaysRemaining: summary.trialDaysRemaining,
      canSync: summary.canSync,
      canAddSeats: summary.canAddSeats,
      canAddSources: summary.canAddSources,
      availablePlans: Object.values(PLAN_DEFINITIONS).map((plan) => ({
        id: plan.id,
        label: plan.label,
        maxSeats: plan.maxSeats,
        maxSources: plan.maxSources,
        syncIntervalHours: plan.syncIntervalHours,
        priceHint: plan.priceHint,
      })),
      billing: {
        stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
        hasSubscription: Boolean(summary.organization.stripeSubscriptionId),
      },
    });
  } catch (error) {
    return handleApiError(error, "Failed to load plan");
  }
}
