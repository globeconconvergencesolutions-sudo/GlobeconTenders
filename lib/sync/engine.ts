import { and, eq, isNotNull, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  countries,
  regions,
  serviceLines,
  sources,
  tenderServiceLineMatches,
  tenders,
  type Source,
} from "@/lib/db/schema";
import {
  detectRegionAndCountry,
  matchServiceLines,
} from "@/lib/matching";
import { fetchAfdbProcurementTenders } from "@/lib/sync/afdb-procurement";
import { fetchDocumentSourceTenders } from "@/lib/sync/document";
import { fetchGenericRssTenders } from "@/lib/sync/generic-rss";
import { fetchKenyaPpipTenders } from "@/lib/sync/kenya-ppip";
import { fetchTenderYetuTenders } from "@/lib/sync/tender-yetu";
import type { SyncTenderItem } from "@/lib/sync/types";
import { fetchWorldBankTenders } from "@/lib/sync/world-bank";

export type SyncResult = {
  sourceId: number;
  sourceName: string;
  inserted: number;
  updated: number;
  errors: string[];
};

const IMPLEMENTED_ADAPTERS = new Set<Source["adapter"]>([
  "world-bank",
  "tender-yetu",
  "kenya-ppip",
  "afdb-procurement",
  "generic-rss",
  "document",
]);

async function fetchItemsForAdapter(
  adapter: Source["adapter"],
  source: Source,
): Promise<SyncTenderItem[]> {
  switch (adapter) {
    case "world-bank":
      return fetchWorldBankTenders();
    case "tender-yetu":
      return fetchTenderYetuTenders();
    case "kenya-ppip":
      return fetchKenyaPpipTenders();
    case "afdb-procurement":
      return fetchAfdbProcurementTenders(source.url ?? "");
    case "generic-rss":
      return fetchGenericRssTenders(
        source.url ?? "",
        source.name ?? "RSS Feed",
      );
    case "document":
      return fetchDocumentSourceTenders(source);
    default:
      throw new Error(`Adapter "${adapter}" is not implemented yet`);
  }
}

export async function syncSource(sourceId: number): Promise<SyncResult> {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, sourceId))
    .limit(1);

  if (!source) throw new Error("Source not found");
  if (source.archivedAt) throw new Error("Source is archived");
  if (!source.enabled) throw new Error("Source is disabled");
  if (!IMPLEMENTED_ADAPTERS.has(source.adapter)) {
    throw new Error(`Adapter "${source.adapter}" is not implemented yet`);
  }

  const [allRegions, allCountries, allServiceLines] = await Promise.all([
    db.select().from(regions),
    db
      .select({
        id: countries.id,
        regionId: countries.regionId,
        name: countries.name,
        slug: countries.slug,
        keywords: countries.keywords,
        isBuiltIn: countries.isBuiltIn,
        createdById: countries.createdById,
        createdAt: countries.createdAt,
        regionSlug: regions.slug,
      })
      .from(countries)
      .innerJoin(regions, eq(countries.regionId, regions.id)),
    db.select().from(serviceLines),
  ]);

  const items = await fetchItemsForAdapter(source.adapter, source);

  let inserted = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const item of items) {
    try {
      const geo = detectRegionAndCountry(
        `${item.title} ${item.description ?? ""}`,
        allRegions,
        allCountries,
      );
      const matches = matchServiceLines(
        `${item.title} ${item.description ?? ""} ${item.category}`,
        allServiceLines,
      );
      const topScore = matches[0]?.score ?? 0;

      const [existing] = await db
        .select({ id: tenders.id })
        .from(tenders)
        .where(
          and(
            eq(tenders.sourceId, source.id),
            eq(tenders.referenceId, item.referenceId),
          ),
        )
        .limit(1);

      let tenderId: number;

      if (existing) {
        await db
          .update(tenders)
          .set({
            title: item.title,
            description: item.description,
            category: item.category,
            deadline: item.deadline,
            url: item.url,
            projectLabel: item.projectLabel,
            regionId: geo.regionId,
            countryId: geo.countryId,
            regionLabel: geo.regionLabel,
            countryLabel: geo.countryLabel,
            matchScore: topScore,
            isClosed: item.deadline < new Date(),
            updatedAt: new Date(),
          })
          .where(eq(tenders.id, existing.id));
        tenderId = existing.id;
        updated += 1;
      } else {
        const [created] = await db
          .insert(tenders)
          .values({
            sourceId: source.id,
            referenceId: item.referenceId,
            title: item.title,
            description: item.description,
            category: item.category,
            deadline: item.deadline,
            url: item.url,
            projectLabel: item.projectLabel,
            regionId: geo.regionId,
            countryId: geo.countryId,
            regionLabel: geo.regionLabel,
            countryLabel: geo.countryLabel,
            matchScore: topScore,
            isClosed: item.deadline < new Date(),
          })
          .returning({ id: tenders.id });
        tenderId = created.id;
        inserted += 1;
      }

      await db
        .delete(tenderServiceLineMatches)
        .where(eq(tenderServiceLineMatches.tenderId, tenderId));

      if (matches.length > 0) {
        await db.insert(tenderServiceLineMatches).values(
          matches.map((m) => ({
            tenderId,
            serviceLineId: m.serviceLineId,
            score: m.score,
          })),
        );
      }
    } catch (error) {
      errors.push(
        `${item.referenceId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  await db
    .update(sources)
    .set({
      lastSyncedAt: new Date(),
      lastSyncStatus: errors.length ? "partial" : "success",
      lastSyncError: errors.length ? errors.slice(0, 3).join("; ") : null,
    })
    .where(eq(sources.id, source.id));

  return {
    sourceId: source.id,
    sourceName: source.name,
    inserted,
    updated,
    errors,
  };
}

export async function syncAllEnabledSources(_triggeredBy = "manual") {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const enabledSources = await db
    .select()
    .from(sources)
    .where(and(eq(sources.enabled, true), isNull(sources.archivedAt)));

  const results: SyncResult[] = [];

  for (const source of enabledSources) {
    if (!IMPLEMENTED_ADAPTERS.has(source.adapter)) continue;

    try {
      results.push(await syncSource(source.id));
    } catch (error) {
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        inserted: 0,
        updated: 0,
        errors: [
          error instanceof Error ? error.message : "Sync failed unexpectedly",
        ],
      });
    }
  }

  return results;
}
