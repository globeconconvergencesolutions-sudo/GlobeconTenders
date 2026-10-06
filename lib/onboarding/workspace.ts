import { and, count, eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  companyProfiles,
  evidenceDocuments,
  orgMemberships,
  qualificationAssessments,
  sources,
  watchlistLines,
  watchlists,
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
      watchlistLines: 0,
      hasCompanyProfile: false,
      evidenceCount: 0,
      assessmentCount: 0,
    };
  }

  const settings = await getWorkspaceSettings(orgId);

  const [[memberRow], [sourceRow], [profileRow], [evidenceRow], [assessmentRow], [lineRow]] =
    await Promise.all([
    db
      .select({ value: count() })
      .from(orgMemberships)
      .where(
        and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.isActive, true)),
      ),
    db
      .select({
        tracking: sql<number>`count(*) filter (where ${sources.enabled} = true and ${sources.archivedAt} is null)`,
        lastSynced: sql<Date | null>`max(${sources.lastSyncedAt})`,
      })
      .from(sources)
      .where(eq(sources.orgId, orgId)),
    db
      .select({
        legalName: companyProfiles.legalName,
        description: companyProfiles.description,
      })
      .from(companyProfiles)
      .where(eq(companyProfiles.orgId, orgId))
      .limit(1),
    db
      .select({ value: count() })
      .from(evidenceDocuments)
      .where(eq(evidenceDocuments.orgId, orgId)),
    db
      .select({ value: count() })
      .from(qualificationAssessments)
      .where(eq(qualificationAssessments.orgId, orgId)),
    db
      .select({ value: count() })
      .from(watchlistLines)
      .innerJoin(watchlists, eq(watchlists.id, watchlistLines.watchlistId))
      .where(and(eq(watchlists.orgId, orgId), eq(watchlists.isActive, true))),
  ]);

  const hasCompanyProfile = Boolean(
    profileRow?.legalName?.trim() && profileRow.description?.trim(),
  );

  return {
    trackingSources: Number(sourceRow?.tracking ?? 0),
    lastSynced: sourceRow?.lastSynced
      ? new Date(sourceRow.lastSynced).toISOString()
      : null,
    teamMemberCount: Number(memberRow?.value ?? 0),
    hasCustomBranding: hasCustomBranding(settings.branding),
    watchlistLines: Number(lineRow?.value ?? 0),
    hasCompanyProfile,
    evidenceCount: Number(evidenceRow?.value ?? 0),
    assessmentCount: Number(assessmentRow?.value ?? 0),
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
