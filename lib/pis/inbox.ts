import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  alertReads,
  evidenceDocuments,
  opportunityVersions,
  tenders,
} from "@/lib/db/schema";

import { getActiveWatchlist, watchlistMatchSql } from "./watchlist-feed";

type Db = NonNullable<ReturnType<typeof getDb>>;

export type InboxItem = {
  key: string;
  group:
    | "Closing soon"
    | "New in the watchlist"
    | "Keyword match"
    | "Deadline changed"
    | "Evidence expiring";
  title: string;
  detail: string;
  href: string;
  read: boolean;
};

export async function loadInbox(db: Db, orgId: number, userId: number): Promise<InboxItem[]> {
  const watchlist = await getActiveWatchlist(db, orgId);
  const match =
    watchlist && watchlist.lineIds.length > 0
      ? watchlistMatchSql(watchlist.lineIds)
      : sql`false`;
  const now = new Date();
  const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [closing, fresh, high, changes, expiring, reads] = await Promise.all([
    db
      .select({ id: tenders.id, title: tenders.title, deadline: tenders.deadline })
      .from(tenders)
      .where(
        and(
          eq(tenders.orgId, orgId),
          eq(tenders.hasHardDeadline, true),
          eq(tenders.isClosed, false),
          gte(tenders.deadline, now),
          lte(tenders.deadline, week),
          match,
        ),
      )
      .orderBy(asc(tenders.deadline))
      .limit(12),
    db
      .select({ id: tenders.id, title: tenders.title, createdAt: tenders.createdAt })
      .from(tenders)
      .where(and(eq(tenders.orgId, orgId), gte(tenders.createdAt, weekAgo), match))
      .orderBy(desc(tenders.createdAt))
      .limit(12),
    db
      .select({ id: tenders.id, title: tenders.title, matchScore: tenders.matchScore })
      .from(tenders)
      .where(and(eq(tenders.orgId, orgId), gte(tenders.matchScore, 30), match))
      .orderBy(desc(tenders.matchScore))
      .limit(12),
    db
      .select({
        id: opportunityVersions.id,
        tenderId: tenders.id,
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
          gte(opportunityVersions.detectedAt, monthAgo),
          match,
        ),
      )
      .orderBy(desc(opportunityVersions.detectedAt))
      .limit(12),
    db
      .select({
        id: evidenceDocuments.id,
        name: evidenceDocuments.name,
        expiresOn: evidenceDocuments.expiresOn,
      })
      .from(evidenceDocuments)
      .where(eq(evidenceDocuments.orgId, orgId))
      .limit(40),
    db
      .select({ alertKey: alertReads.alertKey })
      .from(alertReads)
      .where(and(eq(alertReads.orgId, orgId), eq(alertReads.userId, userId))),
  ]);

  const readKeys = new Set(reads.map((row) => row.alertKey));
  const today = now.toISOString().slice(0, 10);
  const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const items: InboxItem[] = [
    ...closing.map((row) => ({
      key: `closing:${row.id}`,
      group: "Closing soon" as const,
      title: row.title,
      detail: "Official close is inside the next 7 days.",
      href: `/opportunities/${row.id}`,
      read: false,
    })),
    ...fresh.map((row) => ({
      key: `new:${row.id}`,
      group: "New in the watchlist" as const,
      title: row.title,
      detail: "Added to the stored notices in the last 7 days.",
      href: `/opportunities/${row.id}`,
      read: false,
    })),
    ...high.map((row) => ({
      key: `high:${row.id}`,
      group: "Keyword match" as const,
      title: row.title,
      detail: `Keyword match ${row.matchScore}. This is the older word score, not a qualification result.`,
      href: `/opportunities/${row.id}`,
      read: false,
    })),
    ...changes.map((row) => ({
      key: `deadline:${row.id}`,
      group: "Deadline changed" as const,
      title: row.title,
      detail: `Closing moved from ${row.previousValue ?? "unknown"} to ${row.newValue ?? "unknown"}.`,
      href: `/opportunities/${row.tenderId}`,
      read: false,
    })),
    ...expiring
      .filter((row) => row.expiresOn && row.expiresOn >= today && row.expiresOn <= soon)
      .map((row) => ({
        key: `evidence:${row.id}:${row.expiresOn}`,
        group: "Evidence expiring" as const,
        title: row.name,
        detail: `Expires ${row.expiresOn}.`,
        href: "/evidence",
        read: false,
      })),
  ];

  return items.map((item) => ({ ...item, read: readKeys.has(item.key) }));
}
