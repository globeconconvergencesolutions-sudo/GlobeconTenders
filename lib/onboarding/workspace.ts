import { and, count, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  orgMemberships,
  workspaceSettings,
  type WorkspaceBrandingSettings,
} from "@/lib/db/schema";
import type {
  OnboardingSignals,
  WorkspaceOnboardingState,
} from "@/lib/onboarding/steps";
import { getWorkspaceSettings } from "@/lib/settings/workspace";

function hasCustomBranding(branding: WorkspaceBrandingSettings): boolean {
  return Boolean(
    branding.displayName?.trim() ||
      branding.logoUrl?.trim() ||
      branding.primaryColor?.trim() ||
      branding.accentColor?.trim(),
  );
}

export async function getOnboardingState(
  orgId: number,
): Promise<WorkspaceOnboardingState> {
  const db = getDb();
  if (!db) return {};

  const [row] = await db
    .select({ onboarding: workspaceSettings.onboarding })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.orgId, orgId))
    .limit(1);

  return (row?.onboarding as WorkspaceOnboardingState | undefined) ?? {};
}

export async function getOnboardingSignals(orgId: number): Promise<OnboardingSignals> {
  const db = getDb();
  if (!db) {
    return {
      trackingSources: 0,
      lastSynced: null,
      teamMemberCount: 0,
      hasCustomBranding: false,
    };
  }

  const settings = await getWorkspaceSettings(orgId);

  const [[memberRow], sourceStats] = await Promise.all([
    db
      .select({ value: count() })
      .from(orgMemberships)
      .where(
        and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.isActive, true)),
      ),
    import("@/lib/tenders/queries").then((m) =>
      m.getDashboardStats({ page: 1, pageSize: 1, hideClosed: true }),
    ),
  ]);

  return {
    trackingSources: sourceStats.trackingSources,
    lastSynced: sourceStats.lastSynced?.toISOString() ?? null,
    teamMemberCount: Number(memberRow?.value ?? 0),
    hasCustomBranding: hasCustomBranding(settings.branding),
  };
}

export async function getOnboardingContext(orgId: number) {
  const [state, signals] = await Promise.all([
    getOnboardingState(orgId),
    getOnboardingSignals(orgId),
  ]);
  return { state, signals };
}

export async function dismissOnboarding(orgId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  const current = await getOnboardingState(orgId);

  await db
    .update(workspaceSettings)
    .set({
      onboarding: { ...current, dismissed: true },
      updatedAt: new Date(),
    })
    .where(eq(workspaceSettings.orgId, orgId));
}

export async function markOnboardingStep(
  orgId: number,
  stepId: import("@/lib/onboarding/steps").OnboardingStepId,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  const current = await getOnboardingState(orgId);
  const completed = new Set(current.manuallyCompleted ?? []);
  completed.add(stepId);

  await db
    .update(workspaceSettings)
    .set({
      onboarding: {
        ...current,
        manuallyCompleted: Array.from(completed),
      },
      updatedAt: new Date(),
    })
    .where(eq(workspaceSettings.orgId, orgId));
}
