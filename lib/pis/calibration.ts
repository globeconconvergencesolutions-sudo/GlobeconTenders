import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  catalogServiceLines,
  marketFields,
  organizations,
  watchlists,
} from "@/lib/db/schema";
import { guidanceForField } from "@/lib/pis/field-guidance";
import { replaceWatchlistLines } from "@/lib/pis/taxonomy";
import { getActiveWatchlist } from "@/lib/pis/watchlist-feed";

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function watchlistNeedsMarkets(db: Db, orgId: number): Promise<boolean> {
  const watchlist = await getActiveWatchlist(db, orgId);
  return !watchlist || watchlist.lineIds.length === 0;
}

/** Send a procurement workspace with no topics to the market chooser. */
export async function redirectIfMarketsUnset(orgId: number) {
  const db = getDb();
  if (!db) return;
  if (await watchlistNeedsMarkets(db, orgId)) {
    redirect("/setup");
  }
}

export type MarketBrief = {
  fieldName: string;
  guidance: string;
  sampleLines: string[];
};

export async function loadMarketBrief(db: Db, orgId: number): Promise<MarketBrief[]> {
  const watchlist = await getActiveWatchlist(db, orgId);
  if (!watchlist || watchlist.lineIds.length === 0) return [];

  const rows = await db
    .select({
      fieldName: marketFields.name,
      fieldSlug: marketFields.slug,
      sortOrder: marketFields.sortOrder,
      lineName: catalogServiceLines.name,
    })
    .from(catalogServiceLines)
    .innerJoin(marketFields, eq(marketFields.id, catalogServiceLines.marketFieldId))
    .where(inArray(catalogServiceLines.id, watchlist.lineIds));

  const grouped = new Map<string, MarketBrief & { sortOrder: number }>();
  for (const row of rows) {
    const current = grouped.get(row.fieldSlug) ?? {
      fieldName: row.fieldName,
      guidance: guidanceForField(row.fieldSlug),
      sampleLines: [],
      sortOrder: row.sortOrder,
    };
    if (current.sampleLines.length < 4) current.sampleLines.push(row.lineName);
    grouped.set(row.fieldSlug, current);
  }

  return [...grouped.values()]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ fieldName, guidance, sampleLines }) => ({ fieldName, guidance, sampleLines }));
}

export function marketNamesSentence(names: string[]): string {
  if (names.length === 0) return "Choose your markets so this list belongs to your firm.";
  const shown = names.slice(0, 3);
  const extra = names.length - shown.length;
  const list = extra > 0 ? `${shown.join(", ")}, and ${extra} more` : shown.join(", ");
  return `Your markets: ${list}.`;
}

/**
 * Creates the firm's first watchlist from the fields they picked.
 * Refuses once an active watchlist already has lines, so Globecon Core is left in place.
 */
export async function createWatchlistForFields(
  db: Db,
  orgId: number,
  fieldIds: number[],
  userId: number | null,
): Promise<{ id: number; lineCount: number }> {
  const existing = await getActiveWatchlist(db, orgId);
  if (existing && existing.lineIds.length > 0) {
    throw new Error("MARKETS_ALREADY_SET");
  }

  const uniqueFields = [...new Set(fieldIds)];
  if (uniqueFields.length === 0) throw new Error("NO_MARKET_LINES");

  const lines = await db
    .select({ id: catalogServiceLines.id })
    .from(catalogServiceLines)
    .where(
      and(
        inArray(catalogServiceLines.marketFieldId, uniqueFields),
        eq(catalogServiceLines.active, true),
      ),
    );
  if (lines.length === 0) throw new Error("NO_MARKET_LINES");

  const [org] = await db
    .select({ name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);
  const name = `${(org?.name ?? "Workspace").trim()} markets`.slice(0, 80);

  let watchlistId = existing?.id ?? null;
  if (watchlistId) {
    await db
      .update(watchlists)
      .set({ name, updatedAt: new Date() })
      .where(and(eq(watchlists.id, watchlistId), eq(watchlists.orgId, orgId)));
  } else {
    const [created] = await db
      .insert(watchlists)
      .values({
        orgId,
        name,
        isActive: false,
        countryNames: [],
        procurementTypeIds: [],
        createdById: userId,
      })
      .returning({ id: watchlists.id });
    watchlistId = created.id;
  }

  await replaceWatchlistLines(
    db,
    watchlistId,
    lines.map((line) => line.id),
  );

  await db
    .update(watchlists)
    .set({ isActive: false })
    .where(eq(watchlists.orgId, orgId));
  await db
    .update(watchlists)
    .set({ isActive: true, updatedAt: new Date() })
    .where(eq(watchlists.id, watchlistId));

  return { id: watchlistId, lineCount: lines.length };
}
