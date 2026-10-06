import { and, eq, gte, lte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  evidenceDocuments,
  opportunityVersions,
  tenders,
} from "@/lib/db/schema";

import { getActiveWatchlist, watchlistMatchSql } from "./watchlist-feed";

/** Notes for the digest: deadline history and evidence that will expire. */
export async function collectPisAlertNotes(orgId: number): Promise<string[]> {
  const db = getDb();
  if (!db) return [];

  const notes: string[] = [];
  const watchlist = await getActiveWatchlist(db, orgId);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const changes = await db
    .select({
      title: tenders.title,
      previousValue: opportunityVersions.previousValue,
      newValue: opportunityVersions.newValue,
    })
    .from(opportunityVersions)
    .innerJoin(tenders, eq(tenders.id, opportunityVersions.tenderId))
    .where(
      and(
        eq(tenders.orgId, orgId),
        eq(opportunityVersions.field, "deadline"),
        gte(opportunityVersions.detectedAt, since),
        watchlist ? watchlistMatchSql(watchlist.lineIds) : sql`true`,
      ),
    )
    .limit(8);

  for (const change of changes) {
    notes.push(
      `Deadline change: ${change.title} moved from ${change.previousValue ?? "unknown"} to ${change.newValue ?? "unknown"}. The previous date is kept in history.`,
    );
  }

  const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const expiring = await db
    .select({
      name: evidenceDocuments.name,
      expiresOn: evidenceDocuments.expiresOn,
    })
    .from(evidenceDocuments)
    .where(
      and(
        eq(evidenceDocuments.orgId, orgId),
        sql`${evidenceDocuments.expiresOn} is not null`,
        gte(evidenceDocuments.expiresOn, today),
        lte(evidenceDocuments.expiresOn, soon),
      ),
    )
    .limit(8);

  for (const doc of expiring) {
    notes.push(`Evidence expiring: ${doc.name} on ${doc.expiresOn}.`);
  }

  return notes;
}
