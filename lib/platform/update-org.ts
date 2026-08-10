import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import {
  getPlanDefinition,
  isPlanId,
  planLimitsFor,
  type PlanId,
} from "@/lib/platform/plans";
import {
  ORG_STATUS_ACTIVE,
  ORG_STATUS_SUSPENDED,
  ORG_STATUS_TRIAL_EXPIRED,
} from "@/lib/platform/org-status";

export type UpdateOrganizationInput = {
  status?: typeof ORG_STATUS_ACTIVE | typeof ORG_STATUS_SUSPENDED | typeof ORG_STATUS_TRIAL_EXPIRED;
  plan?: PlanId;
};

export async function updateOrganizationForPlatform(
  orgId: number,
  input: UpdateOrganizationInput,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [existing] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!existing) throw new Error("ORG_NOT_FOUND");

  const plan = input.plan ?? (existing.plan as PlanId);
  if (input.plan && !isPlanId(input.plan)) {
    throw new Error("INVALID_PLAN");
  }

  const limits = planLimitsFor(plan);
  const now = new Date();

  const [updated] = await db
    .update(organizations)
    .set({
      ...(input.status ? { status: input.status } : {}),
      ...(input.plan
        ? {
            plan: input.plan,
            maxSeats: limits.maxSeats,
            maxSources: limits.maxSources,
            syncIntervalHours: limits.syncIntervalHours,
          }
        : {}),
      updatedAt: now,
    })
    .where(eq(organizations.id, orgId))
    .returning();

  return {
    organization: updated,
    plan: getPlanDefinition(updated.plan),
  };
}

export async function getOrganizationForPlatform(orgId: number) {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  return row ?? null;
}
