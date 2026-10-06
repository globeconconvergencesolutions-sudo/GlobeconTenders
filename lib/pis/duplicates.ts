import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { opportunityRelations, tenders } from "@/lib/db/schema";

import { isDuplicateCandidate, orderedPair } from "./decisions";

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function refreshDuplicateProposals(db: Db, orgId: number) {
  const rows = await db
    .select({
      id: tenders.id,
      sourceId: tenders.sourceId,
      title: tenders.title,
      buyer: tenders.buyer,
      deadline: tenders.deadline,
      referenceId: tenders.referenceId,
    })
    .from(tenders)
    .where(eq(tenders.orgId, orgId))
    .limit(250);

  const existing = await db
    .select({
      left: opportunityRelations.leftTenderId,
      right: opportunityRelations.rightTenderId,
    })
    .from(opportunityRelations)
    .where(eq(opportunityRelations.orgId, orgId));
  const known = new Set(existing.map((row) => `${row.left}:${row.right}`));

  const inserts: Array<{
    orgId: number;
    leftTenderId: number;
    rightTenderId: number;
    status: string;
    reason: string;
  }> = [];

  for (let i = 0; i < rows.length; i += 1) {
    for (let j = i + 1; j < rows.length; j += 1) {
      const left = rows[i];
      const right = rows[j];
      if (!isDuplicateCandidate(left, right)) continue;
      const [low, high] = orderedPair(left.id, right.id);
      const key = `${low}:${high}`;
      if (known.has(key)) continue;
      known.add(key);
      const sameReference = left.referenceId && left.referenceId === right.referenceId;
      inserts.push({
        orgId,
        leftTenderId: low,
        rightTenderId: high,
        status: "proposed",
        reason: sameReference
          ? "Same reference on two sources."
          : "Same title, buyer, and closing day on two sources.",
      });
      if (inserts.length >= 40) break;
    }
    if (inserts.length >= 40) break;
  }

  if (inserts.length > 0) {
    await db.insert(opportunityRelations).values(inserts);
  }
}

export async function relationsForTender(db: Db, orgId: number, tenderId: number) {
  return db
    .select()
    .from(opportunityRelations)
    .where(
      and(
        eq(opportunityRelations.orgId, orgId),
        eq(opportunityRelations.status, "confirmed"),
      ),
    )
    .then((rows) =>
      rows.filter((row) => row.leftTenderId === tenderId || row.rightTenderId === tenderId),
    );
}
