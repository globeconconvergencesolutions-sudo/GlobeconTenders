import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { auth } from "@/auth";
import { getDb } from "@/lib/db";
import {
  countries,
  orgMemberships,
  regions,
  serviceLines,
  sources,
  syncLogs,
  tenderServiceLineMatches,
  tenders,
  type FilterState,
  type TenderWithSource,
  EMPTY_FILTER_STATE,
} from "@/lib/db/schema";
import { requireCurrentOrg } from "@/lib/tenant/context";
import {
  listingBucketSql,
  liveListingSql,
  staleListingSql,
  archiveListingSql,
  type ListingBucket,
} from "@/lib/tenders/lifecycle";

async function resolveOrgId(orgId?: number): Promise<number> {
  if (orgId != null && orgId > 0) return orgId;
  const session = await auth();
  const sessionOrgId = Number(session?.user?.orgId ?? 0);
  if (sessionOrgId > 0) return sessionOrgId;
  const org = await requireCurrentOrg();
  return org.id;
}

function scopeToOrg(orgId: number, whereClause?: ReturnType<typeof and>) {
  return whereClause
    ? and(eq(tenders.orgId, orgId), whereClause)
    : eq(tenders.orgId, orgId);
}

export type TenderSort = "closing_soonest" | "recently_issued";

export type TenderQueryFilters = {
  search?: string;
  /** @deprecated Prefer listingBucket. true → live, false → all. */
  hideClosed?: boolean;
  listingBucket?: ListingBucket;
  sort?: TenderSort;
  savedOnly?: boolean;
  filterState?: FilterState;
  page?: number;
  pageSize?: number;
};

export type PaginatedTenders = {
  items: TenderWithSource[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type DashboardStats = {
  matchingTenders: number;
  closingWithin3Days: number;
  openInDatabase: number;
  staleListings: number;
  archivedListings: number;
  activeSources: number;
  lastSynced: Date | null;
  trackingSources: number;
};

export const DEFAULT_PAGE_SIZE = 10;

export function resolveListingBucket(
  filters: Pick<TenderQueryFilters, "listingBucket" | "hideClosed">,
): ListingBucket {
  if (filters.listingBucket) return filters.listingBucket;
  if (filters.hideClosed === false) return "all";
  return "live";
}

export function buildFilterConditions(filters: TenderQueryFilters) {
  const {
    search,
    savedOnly,
    filterState = EMPTY_FILTER_STATE,
  } = filters;

  const conditions = [];
  const bucket = resolveListingBucket(filters);
  if (bucket !== "all") {
    conditions.push(listingBucketSql(bucket));
  }
  if (savedOnly) conditions.push(eq(tenders.saved, true));

  if (filterState.sourceIds.length > 0) {
    conditions.push(inArray(tenders.sourceId, filterState.sourceIds));
  }

  if (filterState.regionIds.length > 0 || filterState.countryIds.length > 0) {
    const geoConditions = [];
    if (filterState.regionIds.length > 0) {
      geoConditions.push(inArray(tenders.regionId, filterState.regionIds));
    }
    if (filterState.countryIds.length > 0) {
      geoConditions.push(inArray(tenders.countryId, filterState.countryIds));
    }
    if (geoConditions.length === 1) {
      conditions.push(geoConditions[0]);
    } else if (geoConditions.length > 1) {
      conditions.push(or(...geoConditions));
    }
  }

  if (filterState.serviceLineIds.length > 0) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${tenderServiceLineMatches}
        WHERE ${tenderServiceLineMatches.tenderId} = ${tenders.id}
        AND ${tenderServiceLineMatches.serviceLineId} IN (${sql.join(
          filterState.serviceLineIds.map((id) => sql`${id}`),
          sql`, `,
        )})
      )`,
    );
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(tenders.title, pattern),
        ilike(tenders.referenceId, pattern),
        ilike(tenders.category, pattern),
        ilike(sources.name, pattern),
        ilike(tenders.countryLabel, pattern),
        ilike(tenders.regionLabel, pattern),
      ),
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}

export async function getUserFilterState(
  userId: number,
  orgId?: number,
): Promise<FilterState> {
  const db = getDb();
  if (!db) return EMPTY_FILTER_STATE;

  const resolvedOrgId = await resolveOrgId(orgId);

  const [membership] = await db
    .select({ filterState: orgMemberships.filterState })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.userId, userId),
        eq(orgMemberships.orgId, resolvedOrgId),
      ),
    )
    .limit(1);

  const raw = membership?.filterState ?? EMPTY_FILTER_STATE;
  return sanitizeFilterStateForOrg(raw, resolvedOrgId);
}

export async function updateUserFilterState(
  userId: number,
  filterState: FilterState,
  orgId?: number,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const resolvedOrgId = await resolveOrgId(orgId);
  const sanitized = await sanitizeFilterStateForOrg(filterState, resolvedOrgId);

  await db
    .update(orgMemberships)
    .set({ filterState: sanitized })
    .where(
      and(
        eq(orgMemberships.userId, userId),
        eq(orgMemberships.orgId, resolvedOrgId),
      ),
    );

  return sanitized;
}

async function sanitizeFilterStateForOrg(
  filterState: FilterState,
  orgId: number,
): Promise<FilterState> {
  const db = getDb();
  if (!db) return EMPTY_FILTER_STATE;

  const sourceIdsIn = filterState.sourceIds ?? [];
  const serviceLineIdsIn = filterState.serviceLineIds ?? [];
  const regionIdsIn = filterState.regionIds ?? [];
  const countryIdsIn = filterState.countryIds ?? [];

  if (
    sourceIdsIn.length === 0 &&
    serviceLineIdsIn.length === 0 &&
    regionIdsIn.length === 0 &&
    countryIdsIn.length === 0
  ) {
    return {
      ...EMPTY_FILTER_STATE,
      ...filterState,
      sourceIds: [],
      serviceLineIds: [],
      regionIds: [],
      countryIds: [],
    };
  }

  try {
    const [sourceRows, serviceLineRows, regionRows, countryRows] =
      await Promise.all([
        sourceIdsIn.length
          ? db
              .select({ id: sources.id })
              .from(sources)
              .where(
                and(
                  eq(sources.orgId, orgId),
                  isNull(sources.archivedAt),
                  inArray(sources.id, sourceIdsIn),
                ),
              )
          : Promise.resolve([] as Array<{ id: number }>),
        serviceLineIdsIn.length
          ? db
              .select({ id: serviceLines.id })
              .from(serviceLines)
              .where(
                and(
                  eq(serviceLines.orgId, orgId),
                  isNull(serviceLines.archivedAt),
                  inArray(serviceLines.id, serviceLineIdsIn),
                ),
              )
          : Promise.resolve([] as Array<{ id: number }>),
        regionIdsIn.length
          ? db
              .select({ id: regions.id })
              .from(regions)
              .where(
                and(eq(regions.orgId, orgId), inArray(regions.id, regionIdsIn)),
              )
          : Promise.resolve([] as Array<{ id: number }>),
        countryIdsIn.length
          ? db
              .select({ id: countries.id })
              .from(countries)
              .where(
                and(
                  eq(countries.orgId, orgId),
                  inArray(countries.id, countryIdsIn),
                ),
              )
          : Promise.resolve([] as Array<{ id: number }>),
      ]);

    const sourceIds = new Set(sourceRows.map((r) => r.id));
    const serviceLineIds = new Set(serviceLineRows.map((r) => r.id));
    const regionIds = new Set(regionRows.map((r) => r.id));
    const countryIds = new Set(countryRows.map((r) => r.id));

    return {
      ...EMPTY_FILTER_STATE,
      ...filterState,
      sourceIds: sourceIdsIn.filter((id) => sourceIds.has(id)),
      serviceLineIds: serviceLineIdsIn.filter((id) => serviceLineIds.has(id)),
      regionIds: regionIdsIn.filter((id) => regionIds.has(id)),
      countryIds: countryIdsIn.filter((id) => countryIds.has(id)),
    };
  } catch (error) {
    console.error("[filters] sanitizeFilterStateForOrg failed", error);
    return {
      ...EMPTY_FILTER_STATE,
      ...filterState,
      sourceIds: sourceIdsIn,
      serviceLineIds: serviceLineIdsIn,
      regionIds: regionIdsIn,
      countryIds: countryIdsIn,
    };
  }
}

export async function getTendersPaginated(
  filters: TenderQueryFilters = {},
  orgId?: number,
): Promise<PaginatedTenders> {
  const {
    sort = "closing_soonest",
    page = 1,
    pageSize = DEFAULT_PAGE_SIZE,
  } = filters;

  const db = getDb();
  if (!db) {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    };
  }

  const resolvedOrgId = await resolveOrgId(orgId);
  const whereClause = scopeToOrg(resolvedOrgId, buildFilterConditions(filters));
  const orderBy =
    sort === "closing_soonest"
      ? asc(tenders.deadline)
      : desc(tenders.createdAt);

  const offset = (page - 1) * pageSize;

  const [[totalRow], rows] = await Promise.all([
    db
      .select({ count: count() })
      .from(tenders)
      .innerJoin(sources, eq(tenders.sourceId, sources.id))
      .where(whereClause),
    db
      .select({
        id: tenders.id,
        orgId: tenders.orgId,
        sourceId: tenders.sourceId,
        referenceId: tenders.referenceId,
        title: tenders.title,
        description: tenders.description,
        projectLabel: tenders.projectLabel,
        category: tenders.category,
        deadline: tenders.deadline,
        url: tenders.url,
        regionId: tenders.regionId,
        countryId: tenders.countryId,
        regionLabel: tenders.regionLabel,
        countryLabel: tenders.countryLabel,
        sourceStatus: tenders.sourceStatus,
        listingState: tenders.listingState,
        hasHardDeadline: tenders.hasHardDeadline,
        isClosed: tenders.isClosed,
        saved: tenders.saved,
        matchScore: tenders.matchScore,
        customFields: tenders.customFields,
        createdAt: tenders.createdAt,
        updatedAt: tenders.updatedAt,
        sourceName: sources.name,
        sourceColor: sources.color,
        sourceSlug: sources.slug,
        regionName: regions.name,
        countryName: countries.name,
      })
      .from(tenders)
      .innerJoin(sources, eq(tenders.sourceId, sources.id))
      .leftJoin(regions, eq(tenders.regionId, regions.id))
      .leftJoin(countries, eq(tenders.countryId, countries.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(pageSize)
      .offset(offset),
  ]);

  const total = totalRow?.count ?? 0;

  return {
    items: rows.map((row) => ({
      ...row,
      matchedServiceLines: [],
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getDashboardStats(
  filters: TenderQueryFilters = {},
  orgId?: number,
): Promise<DashboardStats> {
  const db = getDb();
  if (!db) {
    return {
      matchingTenders: 0,
      closingWithin3Days: 0,
      openInDatabase: 0,
      staleListings: 0,
      archivedListings: 0,
      activeSources: 0,
      lastSynced: null,
      trackingSources: 0,
    };
  }

  const resolvedOrgId = await resolveOrgId(orgId);
  const catalogWhere = scopeToOrg(
    resolvedOrgId,
    buildFilterConditions({
      ...filters,
      listingBucket: "all",
      hideClosed: false,
    }),
  );
  const bucket = resolveListingBucket(filters);

  const [[tenderRow], [sourceRow]] = await Promise.all([
    db
      .select({
        all: count(),
        live: sql<number>`count(*) filter (where ${liveListingSql})`,
        stale: sql<number>`count(*) filter (where ${staleListingSql})`,
        archived: sql<number>`count(*) filter (where ${archiveListingSql})`,
        closing3: sql<number>`count(*) filter (where ${liveListingSql} and ${tenders.hasHardDeadline} = true and ${tenders.deadline} <= now() + interval '3 days')`,
      })
      .from(tenders)
      .innerJoin(sources, eq(tenders.sourceId, sources.id))
      .where(catalogWhere),
    db
      .select({
        tracking: sql<number>`count(*) filter (where ${sources.enabled} = true and ${sources.archivedAt} is null)`,
        active: sql<number>`count(*) filter (where ${sources.enabled} = true and ${sources.lastSyncedAt} is not null)`,
        lastSynced: sql<Date | null>`max(${sources.lastSyncedAt})`,
      })
      .from(sources)
      .where(eq(sources.orgId, resolvedOrgId)),
  ]);

  const live = Number(tenderRow?.live ?? 0);
  const stale = Number(tenderRow?.stale ?? 0);
  const archived = Number(tenderRow?.archived ?? 0);
  const all = tenderRow?.all ?? 0;
  const matchingTenders =
    bucket === "stale"
      ? stale
      : bucket === "archive"
        ? archived
        : bucket === "all"
          ? all
          : live;

  return {
    matchingTenders,
    closingWithin3Days: Number(tenderRow?.closing3 ?? 0),
    openInDatabase: live,
    staleListings: stale,
    archivedListings: archived,
    activeSources: Number(sourceRow?.active ?? 0),
    lastSynced: sourceRow?.lastSynced
      ? new Date(sourceRow.lastSynced)
      : null,
    trackingSources: Number(sourceRow?.tracking ?? 0),
  };
}

export async function getFilterCatalog(orgId?: number) {
  const db = getDb();
  if (!db) {
    return {
      sources: [],
      serviceLines: [],
      regions: [],
      countries: [],
    };
  }

  const resolvedOrgId = await resolveOrgId(orgId);

  const [sourceRows, serviceLineRows, regionRows, countryRows] =
    await Promise.all([
      db
        .select()
        .from(sources)
        .where(
          and(eq(sources.orgId, resolvedOrgId), isNull(sources.archivedAt)),
        )
        .orderBy(asc(sources.name)),
      db
        .select()
        .from(serviceLines)
        .where(
          and(
            eq(serviceLines.orgId, resolvedOrgId),
            isNull(serviceLines.archivedAt),
          ),
        )
        .orderBy(asc(serviceLines.name)),
      db
        .select()
        .from(regions)
        .where(eq(regions.orgId, resolvedOrgId))
        .orderBy(asc(regions.name)),
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
          regionName: regions.name,
        })
        .from(countries)
        .innerJoin(regions, eq(countries.regionId, regions.id))
        .where(eq(countries.orgId, resolvedOrgId))
        .orderBy(asc(countries.name)),
    ]);

  return {
    sources: sourceRows,
    serviceLines: serviceLineRows,
    regions: regionRows,
    countries: countryRows,
  };
}

export async function getArchivedCatalog(orgId?: number) {
  const db = getDb();
  if (!db) {
    return { sources: [], serviceLines: [] };
  }

  const resolvedOrgId = await resolveOrgId(orgId);

  const [sourceRows, serviceLineRows] = await Promise.all([
    db
      .select()
      .from(sources)
      .where(
        and(eq(sources.orgId, resolvedOrgId), isNotNull(sources.archivedAt)),
      )
      .orderBy(asc(sources.name)),
    db
      .select()
      .from(serviceLines)
      .where(
        and(
          eq(serviceLines.orgId, resolvedOrgId),
          isNotNull(serviceLines.archivedAt),
        ),
      )
      .orderBy(asc(serviceLines.name)),
  ]);

  return {
    sources: sourceRows,
    serviceLines: serviceLineRows,
  };
}

const EXPORT_LIMIT = 5000;

export async function getTendersForExport(
  filters: TenderQueryFilters = {},
  orgId?: number,
): Promise<TenderWithSource[]> {
  const { sort = "closing_soonest" } = filters;
  const db = getDb();
  if (!db) return [];

  const resolvedOrgId = await resolveOrgId(orgId);
  const whereClause = scopeToOrg(resolvedOrgId, buildFilterConditions(filters));
  const orderBy =
    sort === "closing_soonest"
      ? asc(tenders.deadline)
      : desc(tenders.createdAt);

  const rows = await db
    .select({
      id: tenders.id,
      orgId: tenders.orgId,
      sourceId: tenders.sourceId,
      referenceId: tenders.referenceId,
      title: tenders.title,
      description: tenders.description,
      projectLabel: tenders.projectLabel,
      category: tenders.category,
      deadline: tenders.deadline,
      url: tenders.url,
      regionId: tenders.regionId,
      countryId: tenders.countryId,
      regionLabel: tenders.regionLabel,
      countryLabel: tenders.countryLabel,
      sourceStatus: tenders.sourceStatus,
      listingState: tenders.listingState,
      hasHardDeadline: tenders.hasHardDeadline,
      isClosed: tenders.isClosed,
      saved: tenders.saved,
      matchScore: tenders.matchScore,
      customFields: tenders.customFields,
      createdAt: tenders.createdAt,
      updatedAt: tenders.updatedAt,
      sourceName: sources.name,
      sourceColor: sources.color,
      sourceSlug: sources.slug,
      regionName: regions.name,
      countryName: countries.name,
    })
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .leftJoin(regions, eq(tenders.regionId, regions.id))
    .leftJoin(countries, eq(tenders.countryId, countries.id))
    .where(whereClause)
    .orderBy(orderBy)
    .limit(EXPORT_LIMIT);

  return rows.map((row) => ({
    ...row,
    matchedServiceLines: [],
  }));
}

export type AnalyticsSnapshot = {
  totalTenders: number;
  openTenders: number;
  staleTenders: number;
  archivedTenders: number;
  savedTenders: number;
  closingWithin7Days: number;
  closingWithin30Days: number;
  avgMatchScore: number;
  bySource: Array<{ name: string; color: string; count: number }>;
  byRegion: Array<{ name: string; count: number }>;
  byCategory: Array<{ name: string; count: number }>;
  recentSyncs: Array<{
    sourceName: string | null;
    status: string;
    tenderCount: number;
    syncedAt: Date;
  }>;
};

export async function getAnalyticsSnapshot(orgId?: number): Promise<AnalyticsSnapshot> {
  const db = getDb();
  if (!db) {
    return {
      totalTenders: 0,
      openTenders: 0,
      staleTenders: 0,
      archivedTenders: 0,
      savedTenders: 0,
      closingWithin7Days: 0,
      closingWithin30Days: 0,
      avgMatchScore: 0,
      bySource: [],
      byRegion: [],
      byCategory: [],
      recentSyncs: [],
    };
  }

  const resolvedOrgId = await resolveOrgId(orgId);
  const orgFilter = eq(tenders.orgId, resolvedOrgId);

  const [totals] = await db
    .select({
      total: count(),
      open: sql<number>`count(*) filter (where ${liveListingSql})`,
      stale: sql<number>`count(*) filter (where ${staleListingSql})`,
      archived: sql<number>`count(*) filter (where ${archiveListingSql})`,
      saved: sql<number>`count(*) filter (where ${tenders.saved} = true)`,
      closing7: sql<number>`count(*) filter (where ${liveListingSql} and ${tenders.hasHardDeadline} = true and ${tenders.deadline} <= now() + interval '7 days')`,
      closing30: sql<number>`count(*) filter (where ${liveListingSql} and ${tenders.hasHardDeadline} = true and ${tenders.deadline} <= now() + interval '30 days')`,
      avgScore: sql<number>`coalesce(avg(${tenders.matchScore}), 0)`,
    })
    .from(tenders)
    .where(orgFilter);

  const bySource = await db
    .select({
      name: sources.name,
      color: sources.color,
      count: count(),
    })
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .where(and(orgFilter, liveListingSql))
    .groupBy(sources.name, sources.color)
    .orderBy(desc(count()))
    .limit(8);

  const byRegion = await db
    .select({
      name: sql<string>`coalesce(${regions.name}, ${tenders.regionLabel}, 'Unassigned')`.as(
        "name",
      ),
      count: count(),
    })
    .from(tenders)
    .leftJoin(regions, eq(tenders.regionId, regions.id))
    .where(and(orgFilter, liveListingSql))
    .groupBy(
      sql`coalesce(${regions.name}, ${tenders.regionLabel}, 'Unassigned')`,
    )
    .orderBy(desc(count()))
    .limit(8);

  const byCategory = await db
    .select({
      name: tenders.category,
      count: count(),
    })
    .from(tenders)
    .where(and(orgFilter, liveListingSql))
    .groupBy(tenders.category)
    .orderBy(desc(count()))
    .limit(8);

  const recentSyncs = await db
    .select({
      sourceName: sources.name,
      status: syncLogs.status,
      tenderCount: syncLogs.tenderCount,
      syncedAt: syncLogs.syncedAt,
    })
    .from(syncLogs)
    .leftJoin(sources, eq(syncLogs.sourceId, sources.id))
    .where(eq(syncLogs.orgId, resolvedOrgId))
    .orderBy(desc(syncLogs.syncedAt))
    .limit(6);

  return {
    totalTenders: totals?.total ?? 0,
    openTenders: Number(totals?.open ?? 0),
    staleTenders: Number(totals?.stale ?? 0),
    archivedTenders: Number(totals?.archived ?? 0),
    savedTenders: Number(totals?.saved ?? 0),
    closingWithin7Days: Number(totals?.closing7 ?? 0),
    closingWithin30Days: Number(totals?.closing30 ?? 0),
    avgMatchScore: Math.round(Number(totals?.avgScore ?? 0)),
    bySource: bySource.map((row) => ({
      name: row.name,
      color: row.color,
      count: row.count,
    })),
    byRegion: byRegion.map((row) => ({ name: row.name, count: row.count })),
    byCategory: byCategory.map((row) => ({ name: row.name, count: row.count })),
    recentSyncs,
  };
}
