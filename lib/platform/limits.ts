import { and, count, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  orgMemberships,
  organizations,
  sources,
  type Organization,
} from "@/lib/db/schema";
import { getPlanDefinition } from "@/lib/platform/plans";
import { orgAllowsSync, orgAllowsWrites } from "@/lib/platform/org-status";

export class PlanLimitError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export type OrgPlanSnapshot = Pick<
  Organization,
  | "id"
  | "name"
  | "slug"
  | "status"
  | "plan"
  | "trialEndsAt"
  | "maxSeats"
  | "maxSources"
  | "syncIntervalHours"
  | "stripeCustomerId"
  | "stripeSubscriptionId"
>;

export type OrgUsage = {
  seats: number;
  sources: number;
};

export type OrgPlanSummary = {
  organization: OrgPlanSnapshot;
  plan: ReturnType<typeof getPlanDefinition>;
  usage: OrgUsage;
  trialDaysRemaining: number | null;
  canSync: boolean;
  canAddSeats: boolean;
  canAddSources: boolean;
};

export async function getOrganizationPlanSnapshot(
  orgId: number,
): Promise<OrgPlanSnapshot | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      status: organizations.status,
      plan: organizations.plan,
      trialEndsAt: organizations.trialEndsAt,
      maxSeats: organizations.maxSeats,
      maxSources: organizations.maxSources,
      syncIntervalHours: organizations.syncIntervalHours,
      stripeCustomerId: organizations.stripeCustomerId,
      stripeSubscriptionId: organizations.stripeSubscriptionId,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  return row ?? null;
}

export async function getOrgUsage(orgId: number): Promise<OrgUsage> {
  const db = getDb();
  if (!db) return { seats: 0, sources: 0 };

  const [[seatRow], [sourceRow]] = await Promise.all([
    db
      .select({ value: count() })
      .from(orgMemberships)
      .where(
        and(eq(orgMemberships.orgId, orgId), eq(orgMemberships.isActive, true)),
      ),
    db
      .select({ value: count() })
      .from(sources)
      .where(and(eq(sources.orgId, orgId), isNull(sources.archivedAt))),
  ]);

  return {
    seats: Number(seatRow?.value ?? 0),
    sources: Number(sourceRow?.value ?? 0),
  };
}

function trialDaysRemaining(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

export async function getOrgPlanSummary(orgId: number): Promise<OrgPlanSummary | null> {
  const organization = await getOrganizationPlanSnapshot(orgId);
  if (!organization) return null;

  const usage = await getOrgUsage(orgId);
  const plan = getPlanDefinition(organization.plan);

  return {
    organization,
    plan,
    usage,
    trialDaysRemaining: trialDaysRemaining(organization.trialEndsAt),
    canSync: orgAllowsSync(organization.status),
    canAddSeats: usage.seats < organization.maxSeats,
    canAddSources: usage.sources < organization.maxSources,
  };
}

export async function assertCanAddSeat(orgId: number) {
  const summary = await getOrgPlanSummary(orgId);
  if (!summary) throw new PlanLimitError("ORG_NOT_FOUND", "Organization not found");
  if (!orgAllowsWrites(summary.organization.status)) {
    throw new PlanLimitError(
      "ORG_SUSPENDED",
      "Your workspace is suspended. Upgrade your plan to add team members.",
    );
  }
  if (!summary.canAddSeats) {
    throw new PlanLimitError(
      "SEAT_LIMIT",
      `Seat limit reached (${summary.organization.maxSeats}). Upgrade your plan to invite more users.`,
    );
  }
}

export async function assertCanAddSource(orgId: number) {
  const summary = await getOrgPlanSummary(orgId);
  if (!summary) throw new PlanLimitError("ORG_NOT_FOUND", "Organization not found");
  if (!orgAllowsWrites(summary.organization.status)) {
    throw new PlanLimitError(
      "ORG_SUSPENDED",
      "Your workspace is suspended. Upgrade your plan to add sources.",
    );
  }
  if (!summary.canAddSources) {
    throw new PlanLimitError(
      "SOURCE_LIMIT",
      `Source limit reached (${summary.organization.maxSources}). Upgrade your plan to add more sources.`,
    );
  }
}

export async function assertCanSync(orgId: number) {
  const summary = await getOrgPlanSummary(orgId);
  if (!summary) throw new PlanLimitError("ORG_NOT_FOUND", "Organization not found");
  if (!summary.canSync) {
    throw new PlanLimitError(
      "SYNC_BLOCKED",
      summary.organization.status === "trial_expired"
        ? "Your trial has expired. Upgrade your plan to resume syncing."
        : "Sync is unavailable for this workspace. Contact support or upgrade your plan.",
    );
  }
}

export function sourceDueForSync(
  lastSyncedAt: Date | null,
  syncIntervalHours: number,
  now = new Date(),
): boolean {
  if (!lastSyncedAt) return true;
  const intervalMs = syncIntervalHours * 60 * 60 * 1000;
  return now.getTime() - lastSyncedAt.getTime() >= intervalMs;
}
