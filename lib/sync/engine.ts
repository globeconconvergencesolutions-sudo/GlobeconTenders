import { and, eq, inArray, isNull, like } from "drizzle-orm";

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
  scoreOpportunity,
} from "@/lib/matching";
import { getWorkspaceSettings } from "@/lib/settings/workspace";
import { fetchAfdbProcurementTenders } from "@/lib/sync/afdb-procurement";
import { fetchDocumentSourceTenders } from "@/lib/sync/document";
import { fetchGenericRssTenders } from "@/lib/sync/generic-rss";
import { fetchKenyaPpipTenders } from "@/lib/sync/kenya-ppip";
import { fetchTenderYetuTenders } from "@/lib/sync/tender-yetu";
import type { SyncTenderItem } from "@/lib/sync/types";
import { fetchWorldBankTenders } from "@/lib/sync/world-bank";
import { normalizeCategory } from "@/lib/tenders/categories";
import { matchHaystack } from "@/lib/tenders/match-text";
import {
  applyRelevanceGate,
  reconcileTenderListings,
  resolveListingFields,
  type RelevanceOverride,
} from "@/lib/tenders/lifecycle";
import { ensureEnglishReading } from "@/lib/tenders/translate";

export type SyncResult = {
  sourceId: number;
  sourceName: string;
  inserted: number;
  updated: number;
  /** Notices already stored with the same title, deadline, and matches. */
  unchanged: number;
  /** Rows kept in DB but gated out of Live (below match threshold). */
  irrelevant: number;
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

/** Neon returns timestamps in UTC. A local write can come back shifted by the machine offset. */
function sameStoredDeadline(stored: Date | string, next: Date): boolean {
  const diff = Math.abs(new Date(stored).getTime() - next.getTime());
  if (diff < 1500) return true;
  const offset = Math.abs(new Date().getTimezoneOffset()) * 60 * 1000;
  return offset > 0 && Math.abs(diff - offset) < 1500;
}

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

  const workspace = await getWorkspaceSettings(source.orgId);
  const minMatchScore = workspace.relevance.minMatchScore;

  const [allRegions, allCountries, allServiceLines] = await Promise.all([
    db.select().from(regions).where(eq(regions.orgId, source.orgId)),
    db
      .select({
        id: countries.id,
        orgId: countries.orgId,
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
      .innerJoin(regions, eq(countries.regionId, regions.id))
      .where(eq(countries.orgId, source.orgId)),
    db
      .select()
      .from(serviceLines)
      .where(
        and(
          eq(serviceLines.orgId, source.orgId),
          isNull(serviceLines.archivedAt),
        ),
      ),
  ]);

  const items = await fetchItemsForAdapter(source.adapter, source);

  if (source.adapter === "generic-rss" && items.length > 0) {
    await db
      .delete(tenders)
      .where(
        and(
          eq(tenders.sourceId, source.id),
          like(tenders.referenceId, "rss-view_%.cfm"),
        ),
      );
  }

  const stored = await db
    .select({
      id: tenders.id,
      referenceId: tenders.referenceId,
      title: tenders.title,
      description: tenders.description,
      category: tenders.category,
      deadline: tenders.deadline,
      url: tenders.url,
      projectLabel: tenders.projectLabel,
      regionId: tenders.regionId,
      countryId: tenders.countryId,
      regionLabel: tenders.regionLabel,
      countryLabel: tenders.countryLabel,
      matchScore: tenders.matchScore,
      sourceStatus: tenders.sourceStatus,
      listingState: tenders.listingState,
      hasHardDeadline: tenders.hasHardDeadline,
      isClosed: tenders.isClosed,
      relevanceReason: tenders.relevanceReason,
      relevanceOverride: tenders.relevanceOverride,
      sourceLang: tenders.sourceLang,
      titleEn: tenders.titleEn,
      descriptionEn: tenders.descriptionEn,
    })
    .from(tenders)
    .where(eq(tenders.sourceId, source.id));
  const byRef = new Map(stored.map((row) => [row.referenceId, row]));

  const matchRows = await db
    .select({
      tenderId: tenderServiceLineMatches.tenderId,
      serviceLineId: tenderServiceLineMatches.serviceLineId,
      score: tenderServiceLineMatches.score,
    })
    .from(tenderServiceLineMatches)
    .innerJoin(tenders, eq(tenders.id, tenderServiceLineMatches.tenderId))
    .where(eq(tenders.sourceId, source.id));
  const matchSignature = new Map<number, string>();
  for (const row of matchRows) {
    const current = matchSignature.get(row.tenderId);
    const piece = `${row.serviceLineId}:${row.score}`;
    matchSignature.set(row.tenderId, current ? `${current},${piece}` : piece);
  }
  for (const [tenderId, signature] of matchSignature) {
    matchSignature.set(
      tenderId,
      signature.split(",").sort().join(","),
    );
  }

  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  let irrelevant = 0;
  const errors: string[] = [];
  const seen = new Set<string>();
  const translationBudget = { remaining: 8 };
  const creates: Array<typeof tenders.$inferInsert & { matchSignature: string }> = [];
  const rewrites: number[] = [];
  const pendingMatches: Array<{
    tenderId: number;
    serviceLineId: number;
    score: number;
  }> = [];

  for (const item of items) {
    if (seen.has(item.referenceId)) continue;
    seen.add(item.referenceId);
    try {
      const existing = byRef.get(item.referenceId);
      const reading = await ensureEnglishReading(
        db,
        {
          title: item.title,
          description: item.description,
          titleEn: existing?.titleEn,
          descriptionEn: existing?.descriptionEn,
          sourceLang: existing?.sourceLang,
        },
        { delayMs: 120, budget: translationBudget },
      );
      const category = normalizeCategory(item.category, {
        title: reading.matchTitle,
        description: reading.matchDescription,
      });
      const baseListing = resolveListingFields({
        deadline: item.deadline,
        sourceStatus: item.status,
        hasHardDeadline: item.hasHardDeadline,
      });
      const geo = detectRegionAndCountry(
        `${item.title} ${item.description ?? ""} ${reading.matchTitle} ${reading.matchDescription}`,
        allRegions,
        allCountries,
      );
      const scored = scoreOpportunity(
        matchHaystack({
          title: item.title,
          description: item.description,
          category,
          titleEn: reading.titleEn,
          descriptionEn: reading.descriptionEn,
        }),
        allServiceLines,
      );
      const listing = applyRelevanceGate(
        baseListing,
        scored.topScore,
        minMatchScore,
        {
          rawScore: scored.rawTopScore,
          reason: scored.reason,
          override: (existing?.relevanceOverride as RelevanceOverride) ?? null,
        },
      );
      if (
        listing.listingState === "irrelevant" ||
        listing.listingState === "review"
      ) {
        irrelevant += 1;
      }

      const nextMatches = scored.matches
        .map((match) => `${match.serviceLineId}:${match.score}`)
        .sort()
        .join(",");
      const nextRow = {
        title: item.title,
        description: item.description ?? null,
        category,
        deadline: item.deadline,
        url: item.url ?? null,
        projectLabel: item.projectLabel,
        regionId: geo.regionId ?? null,
        countryId: geo.countryId ?? null,
        regionLabel: geo.regionLabel ?? null,
        countryLabel: geo.countryLabel ?? null,
        matchScore: scored.rawTopScore,
        sourceStatus: listing.sourceStatus,
        listingState: listing.listingState,
        hasHardDeadline: listing.hasHardDeadline,
        isClosed: listing.isClosed,
        relevanceReason: listing.relevanceReason ?? null,
        sourceLang: reading.sourceLang,
        titleEn: reading.titleEn,
        descriptionEn: reading.descriptionEn,
      };

      if (!existing) {
        creates.push({
          orgId: source.orgId,
          sourceId: source.id,
          referenceId: item.referenceId,
          ...nextRow,
          matchSignature: nextMatches,
        });
        continue;
      }

      const same =
        existing.title === nextRow.title &&
        (existing.description ?? "") === (nextRow.description ?? "") &&
        existing.category === nextRow.category &&
        (existing.url ?? "") === (nextRow.url ?? "") &&
        existing.projectLabel === nextRow.projectLabel &&
        existing.regionId === nextRow.regionId &&
        existing.countryId === nextRow.countryId &&
        (existing.regionLabel ?? "") === (nextRow.regionLabel ?? "") &&
        (existing.countryLabel ?? "") === (nextRow.countryLabel ?? "") &&
        existing.matchScore === nextRow.matchScore &&
        (existing.sourceStatus ?? "") === (nextRow.sourceStatus ?? "") &&
        existing.listingState === nextRow.listingState &&
        existing.hasHardDeadline === nextRow.hasHardDeadline &&
        existing.isClosed === nextRow.isClosed &&
        (existing.relevanceReason ?? "") === (nextRow.relevanceReason ?? "") &&
        (existing.sourceLang ?? "") === (nextRow.sourceLang ?? "") &&
        (existing.titleEn ?? "") === (nextRow.titleEn ?? "") &&
        (existing.descriptionEn ?? "") === (nextRow.descriptionEn ?? "") &&
        (matchSignature.get(existing.id) ?? "") === nextMatches &&
        sameStoredDeadline(existing.deadline, nextRow.deadline);

      if (same) {
        unchanged += 1;
        continue;
      }

      await db
        .update(tenders)
        .set({ ...nextRow, updatedAt: new Date() })
        .where(eq(tenders.id, existing.id));
      rewrites.push(existing.id);
      pendingMatches.push(
        ...nextMatches.split(",").filter(Boolean).map((piece) => {
          const [serviceLineId, score] = piece.split(":");
          return {
            tenderId: existing.id,
            serviceLineId: Number(serviceLineId),
            score: Number(score),
          };
        }),
      );
      updated += 1;
    } catch (error) {
      errors.push(
        `${item.referenceId}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  if (rewrites.length > 0) {
    await db
      .delete(tenderServiceLineMatches)
      .where(inArray(tenderServiceLineMatches.tenderId, rewrites));
  }
  if (pendingMatches.length > 0) {
    await db.insert(tenderServiceLineMatches).values(pendingMatches);
  }

  for (let index = 0; index < creates.length; index += 40) {
    const chunk = creates.slice(index, index + 40);
    const created = await db
      .insert(tenders)
      .values(chunk.map(({ matchSignature: _matchSignature, ...row }) => row))
      .returning({ id: tenders.id, referenceId: tenders.referenceId });
    inserted += created.length;
    const idByRef = new Map(created.map((row) => [row.referenceId, row.id]));
    const matchValues = chunk.flatMap((row) => {
      const tenderId = idByRef.get(row.referenceId);
      if (!tenderId || !row.matchSignature) return [];
      return row.matchSignature.split(",").map((piece) => {
        const [serviceLineId, score] = piece.split(":");
        return {
          tenderId,
          serviceLineId: Number(serviceLineId),
          score: Number(score),
        };
      });
    });
    if (matchValues.length > 0) {
      await db.insert(tenderServiceLineMatches).values(matchValues);
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
    unchanged,
    irrelevant,
    errors,
  };
}

export async function syncAllEnabledSources(
  triggeredBy = "manual",
  orgId?: number,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const conditions = [
    eq(sources.enabled, true),
    isNull(sources.archivedAt),
  ];
  if (orgId != null) {
    conditions.push(eq(sources.orgId, orgId));
  }

  const enabledSources = await db
    .select()
    .from(sources)
    .where(and(...conditions));

  const results: SyncResult[] = [];

  for (const source of enabledSources) {
    if (!IMPLEMENTED_ADAPTERS.has(source.adapter)) {
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        inserted: 0,
        updated: 0,
        irrelevant: 0,
        errors: [
          source.url
            ? "Browse-only link — Sync cannot pull listings from this page"
            : "Filled by ingest, not by Sync",
        ],
        unchanged: 0,
      });
      continue;
    }

    try {
      results.push(await syncSource(source.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed unexpectedly";
      await db
        .update(sources)
        .set({
          lastSyncStatus: "partial",
          lastSyncError: message.slice(0, 280),
        })
        .where(eq(sources.id, source.id));
      results.push({
        sourceId: source.id,
        sourceName: source.name,
        inserted: 0,
        updated: 0,
        unchanged: 0,
        irrelevant: 0,
        errors: [message],
      });
    }
  }

  const orgIds = [...new Set(enabledSources.map((source) => source.orgId))];
  for (const id of orgIds) {
    await reconcileTenderListings(id);
  }

  return results;
}
