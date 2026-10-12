import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  catalogServiceLines,
  opportunityVersions,
  tenderCatalogMatches,
  tenders,
} from "@/lib/db/schema";
import { keywordOccurs } from "@/lib/matching";
import { matchHaystack } from "@/lib/pis/translate";

type Db = NonNullable<ReturnType<typeof getDb>>;

type KeywordLine = {
  id: number;
  name: string;
  keywords: string[];
};

let keywordCache: KeywordLine[] | null = null;

export function clearCatalogKeywordCache() {
  keywordCache = null;
}

async function keywordLines(db: Db): Promise<KeywordLine[]> {
  if (keywordCache) return keywordCache;
  const rows = await db
    .select({
      id: catalogServiceLines.id,
      name: catalogServiceLines.name,
      keywords: catalogServiceLines.keywords,
    })
    .from(catalogServiceLines);
  keywordCache = rows.filter((row) => row.keywords.length > 0);
  return keywordCache;
}

export type CatalogHit = {
  catalogServiceLineId: number;
  name: string;
  score: number;
  hits: string[];
};

/** The number on the card is the stronger of the older org score and the catalog phrase score. */
export function mergeMatchScores(
  orgTopScore: number,
  orgRawScore: number,
  catalogScore: number,
): { gateScore: number; matchScore: number } {
  return {
    gateScore: Math.max(orgTopScore, catalogScore),
    matchScore: Math.max(orgRawScore, catalogScore),
  };
}

/** Whole-word keyword score. 10 points per hit, same unit as the org matcher. */
export async function scoreCatalogText(db: Db, text: string): Promise<CatalogHit[]> {
  const lines = await keywordLines(db);
  const hits: CatalogHit[] = [];
  for (const line of lines) {
    const matched: string[] = [];
    for (const keyword of line.keywords) {
      if (keywordOccurs(text, keyword)) matched.push(keyword);
    }
    if (matched.length > 0) {
      hits.push({
        catalogServiceLineId: line.id,
        name: line.name,
        score: matched.length * 10,
        hits: matched,
      });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}

export async function replaceTenderCatalogMatches(
  db: Db,
  tenderId: number,
  text: string,
) {
  const hits = await scoreCatalogText(db, text);
  await db
    .delete(tenderCatalogMatches)
    .where(eq(tenderCatalogMatches.tenderId, tenderId));
  if (hits.length === 0) return hits;
  await db.insert(tenderCatalogMatches).values(
    hits.map((hit) => ({
      tenderId,
      catalogServiceLineId: hit.catalogServiceLineId,
      score: hit.score,
    })),
  );
  return hits;
}

export async function recordDeadlineChange(
  db: Db,
  input: {
    tenderId: number;
    sourceId: number;
    previous: Date;
    next: Date;
  },
) {
  if (input.previous.getTime() === input.next.getTime()) return;
  await db.insert(opportunityVersions).values({
    tenderId: input.tenderId,
    sourceId: input.sourceId,
    field: "deadline",
    previousValue: input.previous.toISOString(),
    newValue: input.next.toISOString(),
    note: "Same-source sync reported a different closing date. Previous value kept in history.",
  });
}

export async function reconcileAllCatalogMatches(db: Db): Promise<number> {
  clearCatalogKeywordCache();
  const rows = await db
    .select({
      id: tenders.id,
      title: tenders.title,
      description: tenders.description,
      titleEn: tenders.titleEn,
      descriptionEn: tenders.descriptionEn,
      category: tenders.category,
    })
    .from(tenders);
  for (const row of rows) {
    await replaceTenderCatalogMatches(
      db,
      row.id,
      matchHaystack(row),
    );
  }
  return rows.length;
}
