import { and, eq, lt } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import {
  ORG_STATUS_ACTIVE,
  ORG_STATUS_TRIAL_EXPIRED,
} from "@/lib/platform/org-status";

export type TrialExpiryResult = {
  expiredOrgIds: number[];
  checkedAt: string;
};

export async function expireTrials(): Promise<TrialExpiryResult> {
  const db = getDb();
  if (!db) return { expiredOrgIds: [], checkedAt: new Date().toISOString() };

  const now = new Date();
  const expired = await db
    .update(organizations)
    .set({
      status: ORG_STATUS_TRIAL_EXPIRED,
      updatedAt: now,
    })
    .where(
      and(
        eq(organizations.plan, "trial"),
        eq(organizations.status, ORG_STATUS_ACTIVE),
        lt(organizations.trialEndsAt, now),
      ),
    )
    .returning({ id: organizations.id });

  return {
    expiredOrgIds: expired.map((row) => row.id),
    checkedAt: now.toISOString(),
  };
}
