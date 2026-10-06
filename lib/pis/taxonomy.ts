import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  catalogServiceLines,
  marketFields,
  orgHiddenCatalogLines,
  organizations,
  procurementTypes,
  watchlistLines,
  watchlists,
  type TaxonomySeed,
} from "@/lib/db/schema";

import taxonomySeed from "@/lib/pis/taxonomy-seed.json";

const seed = taxonomySeed as TaxonomySeed;

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function seedProcurementTaxonomy(db: Db): Promise<{
  fields: number;
  lines: number;
  types: number;
  skipped: boolean;
}> {
  const [existing] = await db
    .select({ id: marketFields.id })
    .from(marketFields)
    .limit(1);

  if (existing) {
    return { fields: 0, lines: 0, types: 0, skipped: true };
  }

  const insertedFields = await db
    .insert(marketFields)
    .values(
      seed.fields.map((field) => ({
        code: field.code,
        name: field.name,
        slug: field.slug,
        sortOrder: field.sortOrder,
      })),
    )
    .returning({ id: marketFields.id, slug: marketFields.slug });

  const fieldIdBySlug = new Map(insertedFields.map((row) => [row.slug, row.id]));

  await db.insert(catalogServiceLines).values(
    seed.serviceLines.map((line) => {
      const marketFieldId = fieldIdBySlug.get(line.fieldSlug);
      if (!marketFieldId) {
        throw new Error(`Missing market field ${line.fieldSlug}`);
      }
      return {
        marketFieldId,
        name: line.name,
        slug: line.slug,
        globeconRelevance: line.globeconRelevance,
        keywords: line.keywords,
        legacySlug: line.legacySlug,
      };
    }),
  );

  await db.insert(procurementTypes).values(
    seed.procurementTypes.map((type) => ({
      name: type.name,
      slug: type.slug,
      meaning: type.meaning,
    })),
  );

  return {
    fields: seed.fields.length,
    lines: seed.serviceLines.length,
    types: seed.procurementTypes.length,
    skipped: false,
  };
}

/** Globecon's default watchlist is the Core lines, not the full catalog. */
export async function ensureGlobeconCoreWatchlist(db: Db): Promise<number | null> {
  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, "globecon"))
    .limit(1);
  if (!org) return null;

  const [existing] = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(and(eq(watchlists.orgId, org.id), eq(watchlists.name, "Globecon Core")))
    .limit(1);
  if (existing) {
    await rebuildNamedCoreWatchlist(db, org.id, existing.id);
    return existing.id;
  }

  const coreLines = await db
    .select({ id: catalogServiceLines.id })
    .from(catalogServiceLines)
    .where(eq(catalogServiceLines.globeconRelevance, "core"));

  const [created] = await db
    .insert(watchlists)
    .values({
      orgId: org.id,
      name: "Globecon Core",
      isActive: true,
      countryNames: [],
      procurementTypeIds: [],
    })
    .returning({ id: watchlists.id });

  if (coreLines.length > 0) {
    await db.insert(watchlistLines).values(
      coreLines.map((line) => ({
        watchlistId: created.id,
        catalogServiceLineId: line.id,
      })),
    );
  }

  await db
    .update(watchlists)
    .set({ isActive: false })
    .where(and(eq(watchlists.orgId, org.id), eq(watchlists.isActive, true)));

  await db
    .update(watchlists)
    .set({ isActive: true })
    .where(eq(watchlists.id, created.id));

  return created.id;
}

export async function replaceWatchlistLines(
  db: Db,
  watchlistId: number,
  lineIds: number[],
) {
  const [list] = await db
    .select({ orgId: watchlists.orgId })
    .from(watchlists)
    .where(eq(watchlists.id, watchlistId))
    .limit(1);
  const hidden = list
    ? await db
        .select({ id: orgHiddenCatalogLines.catalogServiceLineId })
        .from(orgHiddenCatalogLines)
        .where(eq(orgHiddenCatalogLines.orgId, list.orgId))
    : [];
  const hiddenIds = new Set(hidden.map((row) => row.id));
  await db.delete(watchlistLines).where(eq(watchlistLines.watchlistId, watchlistId));
  const unique = [...new Set(lineIds)].filter((id) => !hiddenIds.has(id));
  if (unique.length === 0) return;
  const valid = await db
    .select({ id: catalogServiceLines.id })
    .from(catalogServiceLines)
    .where(inArray(catalogServiceLines.id, unique));
  if (valid.length === 0) return;
  await db.insert(watchlistLines).values(
    valid.map((line) => ({
      watchlistId,
      catalogServiceLineId: line.id,
    })),
  );
}

/** Refreshes line membership only when the watchlist is still named Globecon Core. */
export async function rebuildNamedCoreWatchlist(
  db: Db,
  orgId: number,
  watchlistId: number,
): Promise<number | null> {
  const [list] = await db
    .select({ id: watchlists.id, name: watchlists.name })
    .from(watchlists)
    .where(and(eq(watchlists.id, watchlistId), eq(watchlists.orgId, orgId)))
    .limit(1);
  if (!list || list.name !== "Globecon Core") return null;
  const coreLines = await db
    .select({ id: catalogServiceLines.id })
    .from(catalogServiceLines)
    .where(eq(catalogServiceLines.globeconRelevance, "core"));
  await replaceWatchlistLines(
    db,
    list.id,
    coreLines.map((line) => line.id),
  );
  return coreLines.length;
}
