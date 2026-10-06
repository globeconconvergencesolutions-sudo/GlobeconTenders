import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  catalogServiceLines,
  companyCapabilities,
  companyCertifications,
  companyPersonnel,
  companyProfiles,
  companyProjects,
  evidenceDocuments,
  marketFields,
  sources,
  tenderCatalogMatches,
  tenders,
} from "@/lib/db/schema";
import { readinessSections } from "@/lib/pis/qualify";

type Db = NonNullable<ReturnType<typeof getDb>>;

export async function loadMarketSummary(db: Db, orgId: number) {
  const [sourceRows, demandRows, countryRows, coverageRows, profileRows, evidence, capabilityCount, projectCount, personnelCount, certificationCount] =
    await Promise.all([
    db
      .select({
        enabled: sources.enabled,
        reviewStatus: sources.reviewStatus,
        lastSyncedAt: sources.lastSyncedAt,
        lastSyncStatus: sources.lastSyncStatus,
      })
      .from(sources)
      .where(eq(sources.orgId, orgId)),
    db
      .select({
        field: marketFields.name,
        tenderId: tenders.id,
      })
      .from(tenderCatalogMatches)
      .innerJoin(tenders, eq(tenders.id, tenderCatalogMatches.tenderId))
      .innerJoin(
        catalogServiceLines,
        eq(catalogServiceLines.id, tenderCatalogMatches.catalogServiceLineId),
      )
      .innerJoin(marketFields, eq(marketFields.id, catalogServiceLines.marketFieldId))
      .where(eq(tenders.orgId, orgId)),
    db
      .select({
        country: tenders.countryLabel,
        count: sql<number>`count(*)::int`,
      })
      .from(tenders)
      .where(eq(tenders.orgId, orgId))
      .groupBy(tenders.countryLabel),
    db
      .select({
        stored: sql<number>`count(*)::int`,
        missingBuyer: sql<number>`count(*) filter (where ${tenders.buyer} is null or btrim(${tenders.buyer}) = '')::int`,
        missingValue: sql<number>`count(*) filter (where ${tenders.estimatedValue} is null or btrim(${tenders.estimatedValue}) = '')::int`,
      })
      .from(tenders)
      .where(eq(tenders.orgId, orgId)),
    db.select().from(companyProfiles).where(eq(companyProfiles.orgId, orgId)).limit(1),
    db
      .select({ expiresOn: evidenceDocuments.expiresOn })
      .from(evidenceDocuments)
      .where(eq(evidenceDocuments.orgId, orgId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(companyCapabilities)
      .where(eq(companyCapabilities.orgId, orgId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(companyProjects)
      .where(eq(companyProjects.orgId, orgId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(companyPersonnel)
      .where(eq(companyPersonnel.orgId, orgId)),
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(companyCertifications)
      .where(eq(companyCertifications.orgId, orgId)),
  ]);

  const connected = sourceRows.filter(
    (row) => row.enabled && row.reviewStatus !== "candidate",
  );
  const lastSuccess = connected
    .filter((row) => row.lastSyncStatus === "success" && row.lastSyncedAt)
    .map((row) => row.lastSyncedAt as Date)
    .sort((a, b) => b.getTime() - a.getTime())[0] ?? null;

  const fieldCounts = new Map<string, Set<number>>();
  for (const row of demandRows) {
    const set = fieldCounts.get(row.field) ?? new Set<number>();
    set.add(row.tenderId);
    fieldCounts.set(row.field, set);
  }
  const byField = [...fieldCounts.entries()]
    .map(([name, ids]) => ({ name, count: ids.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const buyerField = await db
    .select({
      buyer: tenders.buyer,
      field: marketFields.name,
      tenderId: tenders.id,
    })
    .from(tenderCatalogMatches)
    .innerJoin(tenders, eq(tenders.id, tenderCatalogMatches.tenderId))
    .innerJoin(
      catalogServiceLines,
      eq(catalogServiceLines.id, tenderCatalogMatches.catalogServiceLineId),
    )
    .innerJoin(marketFields, eq(marketFields.id, catalogServiceLines.marketFieldId))
    .where(eq(tenders.orgId, orgId));

  const patterns = new Map<string, { buyer: string; field: string; ids: Set<number> }>();
  for (const row of buyerField) {
    const buyer = row.buyer?.trim();
    if (!buyer) continue;
    const key = `${buyer.toLowerCase()}|${row.field}`;
    const current = patterns.get(key) ?? { buyer, field: row.field, ids: new Set<number>() };
    current.ids.add(row.tenderId);
    patterns.set(key, current);
  }
  const repeats = [...patterns.values()]
    .filter((row) => row.ids.size >= 2)
    .map((row) => ({ buyer: row.buyer, field: row.field, count: row.ids.size }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const soon = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const expiring = evidence.filter((doc) => {
    if (!doc.expiresOn) return false;
    const when = new Date(doc.expiresOn).getTime();
    return Number.isFinite(when) && when < soon;
  }).length;

  const readiness = readinessSections({
    profile: profileRows[0] ?? null,
    capabilities: Number(capabilityCount[0]?.n ?? 0),
    projects: Number(projectCount[0]?.n ?? 0),
    personnel: Number(personnelCount[0]?.n ?? 0),
    certifications: Number(certificationCount[0]?.n ?? 0),
    evidence: evidence.length,
    expiring,
  });

  return {
    connected: connected.length,
    registered: sourceRows.length,
    lastSuccess,
    byField,
    byCountry: countryRows
      .map((row) => ({ name: row.country ?? "Country unknown", count: Number(row.count) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8),
    repeats,
    expiring,
    profileReady: Boolean(profileRows[0]?.legalName),
    readinessComplete: readiness.complete,
    readinessTotal: readiness.total,
    readinessNote: readiness.note,
    stored: Number(coverageRows[0]?.stored ?? 0),
    missingBuyer: Number(coverageRows[0]?.missingBuyer ?? 0),
    missingValue: Number(coverageRows[0]?.missingValue ?? 0),
  };
}
