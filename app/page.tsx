import { TendersDashboard } from "@/components/tenders/tenders-dashboard";
import { getSessionUser } from "@/lib/auth/session";
import type { FilterState } from "@/lib/db/schema";
import {
  DEFAULT_PAGE_SIZE,
  getDashboardStats,
  getTendersPaginated,
  getUserFilterState,
  type TenderSort,
} from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: TenderSort;
    saved?: string;
    showClosed?: string;
  }>;
};

function resolveHideClosed(
  showClosedParam: string | undefined,
  filterState?: FilterState,
): boolean {
  if (showClosedParam === "1") return false;
  if (showClosedParam === "0") return true;
  return filterState?.hideClosed ?? true;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const user = await getSessionUser();
  const page = Math.max(1, Number(params.page) || 1);
  const filterState = user ? await getUserFilterState(user.id) : undefined;

  const search = params.q ?? filterState?.search;
  const sort = params.sort ?? filterState?.sort ?? "closing_soonest";
  const savedOnly =
    params.saved === "1" ||
    (params.saved === undefined && Boolean(filterState?.savedOnly));
  const hideClosed = resolveHideClosed(params.showClosed, filterState);

  const queryFilters = {
    search,
    sort,
    savedOnly,
    hideClosed,
    filterState,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  };

  const [paginated, stats] = await Promise.all([
    getTendersPaginated(queryFilters),
    getDashboardStats(queryFilters),
  ]);

  return (
    <TendersDashboard
      tenders={paginated.items.map((t) => ({
        ...t,
        deadline: t.deadline.toISOString(),
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      }))}
      stats={{
        matchingTenders: stats.matchingTenders,
        closingWithin3Days: stats.closingWithin3Days,
        openInDatabase: stats.openInDatabase,
        activeSources: stats.activeSources,
        trackingSources: stats.trackingSources,
        lastSynced: stats.lastSynced?.toISOString() ?? null,
      }}
      pagination={{
        page: paginated.page,
        totalPages: paginated.totalPages,
        total: paginated.total,
        pageSize: paginated.pageSize,
      }}
      initialSearch={search ?? ""}
      initialSort={sort}
      savedOnly={savedOnly}
      initialHideClosed={hideClosed}
      userRole={user?.role ?? "viewer"}
    />
  );
}
