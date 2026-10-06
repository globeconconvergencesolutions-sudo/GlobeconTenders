import { and, eq, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  tenders,
  watchlistLines,
  watchlists,
} from "@/lib/db/schema";

type Db = NonNullable<ReturnType<typeof getDb>>;

export type ActiveWatchlist = {
  id: number;
  name: string;
  lineIds: number[];
  countryNames: string[];
  procurementTypeIds: number[];
};

export async function getActiveWatchlist(
  db: Db,
  orgId: number,
): Promise<ActiveWatchlist | null> {
  const [list] = await db
    .select()
    .from(watchlists)
    .where(and(eq(watchlists.orgId, orgId), eq(watchlists.isActive, true)))
    .limit(1);
  if (!list) return null;

  const lines = await db
    .select({ id: watchlistLines.catalogServiceLineId })
    .from(watchlistLines)
    .where(eq(watchlistLines.watchlistId, list.id));

  return {
    id: list.id,
    name: list.name,
    lineIds: lines.map((line) => line.id),
    countryNames: list.countryNames,
    procurementTypeIds: list.procurementTypeIds,
  };
}

/**
 * A tender is on the watchlist when a curated catalog keyword hit lands on a
 * selected line, or an existing org service-line match maps to that line via
 * legacy_slug (the original 17 Globecon lines).
 */
export function watchlistMatchSql(lineIds: number[]) {
  if (lineIds.length === 0) return sql`false`;
  const ids = sql.join(
    lineIds.map((id) => sql`${id}`),
    sql`, `,
  );
  return sql`(
    EXISTS (
      SELECT 1 FROM tender_catalog_matches tcm
      WHERE tcm.tender_id = ${tenders.id}
        AND tcm.catalog_service_line_id IN (${ids})
    )
    OR EXISTS (
      SELECT 1 FROM tender_service_line_matches tslm
      INNER JOIN service_lines sl ON sl.id = tslm.service_line_id
      INNER JOIN catalog_service_lines csl ON csl.legacy_slug = sl.slug
      WHERE tslm.tender_id = ${tenders.id}
        AND csl.id IN (${ids})
    )
  )`;
}

export function watchlistConstraintSql(watchlist: ActiveWatchlist | null) {
  if (!watchlist || watchlist.lineIds.length === 0) return null;
  const parts = [watchlistMatchSql(watchlist.lineIds)];
  if (watchlist.countryNames.length > 0) {
    const names = sql.join(
      watchlist.countryNames.map((name) => sql`${name}`),
      sql`, `,
    );
    parts.push(sql`${tenders.countryLabel} IN (${names})`);
  }
  if (watchlist.procurementTypeIds.length > 0) {
    const typeIds = sql.join(
      watchlist.procurementTypeIds.map((id) => sql`${id}`),
      sql`, `,
    );
    parts.push(sql`${tenders.procurementTypeId} IN (${typeIds})`);
  }
  return sql.join(parts, sql` AND `);
}

export function pisFeedSql(
  feed: "watchlist" | "explore",
  watchlist: ActiveWatchlist | null,
): SQL {
  if (!watchlist || watchlist.lineIds.length === 0) {
    return feed === "watchlist" ? sql`false` : sql`true`;
  }
  const match = watchlistMatchSql(watchlist.lineIds);
  if (feed === "explore") return sql`NOT (${match})`;
  return watchlistConstraintSql(watchlist) ?? match;
}
