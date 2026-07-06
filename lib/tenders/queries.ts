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

import { getDb } from "@/lib/db";
import {
  countries,
  regions,
  serviceLines,
  sources,
  syncLogs,
  tenderServiceLineMatches,
  tenders,
  users,
  type FilterState,
  type TenderWithSource,
  EMPTY_FILTER_STATE,
} from "@/lib/db/schema";

export type TenderSort = "closing_soonest" | "recently_issued";

export type TenderQueryFilters = {
  search?: string;
  hideClosed?: boolean;
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
  activeSources: number;
  lastSynced: Date | null;
  trackingSources: number;
};

export const DEFAULT_PAGE_SIZE = 10;

export function buildFilterConditions(filters: TenderQueryFilters) {
  const {
    search,
    hideClosed = true,
    savedOnly,
    filterState = EMPTY_FILTER_STATE,
  } = filters;

  const conditions = [];

  if (hideClosed) conditions.push(eq(tenders.isClosed, false));
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

export async function getUserFilterState(userId: number): Promise<FilterState> {
  const db = getDb();
  if (!db) return EMPTY_FILTER_STATE;

  const [user] = await db
    .select({ filterState: users.filterState })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user?.filterState ?? EMPTY_FILTER_STATE;
}

export async function updateUserFilterState(
  userId: number,
  filterState: FilterState,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  await db
    .update(users)
    .set({ filterState, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getTendersPaginated(
  filters: TenderQueryFilters = {},
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

  const whereClause = buildFilterConditions(filters);
  const orderBy =
    sort === "closing_soonest"
      ? asc(tenders.deadline)
      : desc(tenders.createdAt);

  const offset = (page - 1) * pageSize;

  const [totalRow] = await db
    .select({ count: count() })
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .where(whereClause);

  const rows = await db
    .select({
      id: tenders.id,
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
      isClosed: tenders.isClosed,
      saved: tenders.saved,
      matchScore: tenders.matchScore,
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
    .offset(offset);

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
): Promise<DashboardStats> {
  const db = getDb();
  if (!db) {
    return {
      matchingTenders: 0,
      closingWithin3Days: 0,
      openInDatabase: 0,
      activeSources: 0,
      lastSynced: null,
      trackingSources: 0,
    };
  }

  const whereClause = buildFilterConditions(filters);

  const [openCount] = await db
    .select({ count: count() })
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .where(
      whereClause
        ? and(whereClause, eq(tenders.isClosed, false))
        : eq(tenders.isClosed, false),
    );

  const [closingSoonCount] = await db
    .select({ count: count() })
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .where(
      and(
        whereClause ?? sql`true`,
        eq(tenders.isClosed, false),
        sql`${tenders.deadline} <= now() + interval '3 days'`,
        sql`${tenders.deadline} >= now()`,
      ),
    );

  const [activeSourceCount] = await db
    .select({ count: count() })
    .from(sources)
    .where(
      and(
        eq(sources.enabled, true),
        sql`${sources.lastSyncedAt} IS NOT NULL`,
      ),
    );

  const [trackingSourceCount] = await db
    .select({ count: count() })
    .from(sources)
    .where(and(eq(sources.enabled, true), isNull(sources.archivedAt)));

  const [lastSync] = await db
    .select({ syncedAt: sources.lastSyncedAt })
    .from(sources)
    .where(sql`${sources.lastSyncedAt} IS NOT NULL`)
    .orderBy(desc(sources.lastSyncedAt))
    .limit(1);

  return {
    matchingTenders: openCount?.count ?? 0,
    closingWithin3Days: closingSoonCount?.count ?? 0,
    openInDatabase: openCount?.count ?? 0,
    activeSources: activeSourceCount?.count ?? 0,
    lastSynced: lastSync?.syncedAt ?? null,
    trackingSources: trackingSourceCount?.count ?? 0,
  };
}

export async function getFilterCatalog() {
  const db = getDb();
  if (!db) {
    return {
      sources: [],
      serviceLines: [],
      regions: [],
      countries: [],
    };
  }

  const [sourceRows, serviceLineRows, regionRows, countryRows] =
    await Promise.all([
      db
        .select()
        .from(sources)
        .where(isNull(sources.archivedAt))
        .orderBy(asc(sources.name)),
      db
        .select()
        .from(serviceLines)
        .where(isNull(serviceLines.archivedAt))
        .orderBy(asc(serviceLines.name)),
      db.select().from(regions).orderBy(asc(regions.name)),
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
        .orderBy(asc(countries.name)),
    ]);

  return {
    sources: sourceRows,
    serviceLines: serviceLineRows,
    regions: regionRows,
    countries: countryRows,
  };
}

export async function getArchivedCatalog() {
  const db = getDb();
  if (!db) {
    return { sources: [], serviceLines: [] };
  }

  const [sourceRows, serviceLineRows] = await Promise.all([
    db
      .select()
      .from(sources)
      .where(isNotNull(sources.archivedAt))
      .orderBy(asc(sources.name)),
    db
      .select()
      .from(serviceLines)
      .where(isNotNull(serviceLines.archivedAt))
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
): Promise<TenderWithSource[]> {
  const { sort = "closing_soonest" } = filters;
  const db = getDb();
  if (!db) return [];

  const whereClause = buildFilterConditions(filters);
  const orderBy =
    sort === "closing_soonest"
      ? asc(tenders.deadline)
      : desc(tenders.createdAt);

  const rows = await db
    .select({
      id: tenders.id,
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
      isClosed: tenders.isClosed,
      saved: tenders.saved,
      matchScore: tenders.matchScore,
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

export async function getAnalyticsSnapshot(): Promise<AnalyticsSnapshot> {
  const db = getDb();
  if (!db) {
    return {
      totalTenders: 0,
      openTenders: 0,
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

  const [totals] = await db
    .select({
      total: count(),
      open: sql<number>`count(*) filter (where ${tenders.isClosed} = false)`,
      saved: sql<number>`count(*) filter (where ${tenders.saved} = true)`,
      closing7: sql<number>`count(*) filter (where ${tenders.isClosed} = false and ${tenders.deadline} <= now() + interval '7 days' and ${tenders.deadline} >= now())`,
      closing30: sql<number>`count(*) filter (where ${tenders.isClosed} = false and ${tenders.deadline} <= now() + interval '30 days' and ${tenders.deadline} >= now())`,
      avgScore: sql<number>`coalesce(avg(${tenders.matchScore}), 0)`,
    })
    .from(tenders);

  const bySource = await db
    .select({
      name: sources.name,
      color: sources.color,
      count: count(),
    })
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .where(eq(tenders.isClosed, false))
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
    .where(eq(tenders.isClosed, false))
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
    .where(eq(tenders.isClosed, false))
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
    .orderBy(desc(syncLogs.syncedAt))
    .limit(6);

  return {
    totalTenders: totals?.total ?? 0,
    openTenders: Number(totals?.open ?? 0),
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
