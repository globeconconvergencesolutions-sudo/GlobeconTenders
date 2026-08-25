import { headers } from "next/headers";

import { MarketingLanding } from "@/components/marketing/marketing-landing";
import { TendersDashboard } from "@/components/tenders/tenders-dashboard";
import { auth } from "@/auth";
import { getSessionUser } from "@/lib/auth/session";
import type { FilterState } from "@/lib/db/schema";
import { mergeFilterStateWithUrl } from "@/lib/filters/url-state";
import { computeOnboardingProgress } from "@/lib/onboarding/steps";
import { getOnboardingContext } from "@/lib/onboarding/workspace";
import { isApexHost } from "@/lib/tenant/resolution";
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
    sources?: string;
    lines?: string;
    regions?: string;
    countries?: string;
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
  const headerStore = await headers();
  const host = headerStore.get("host");
  const session = await auth();

  if (isApexHost(host) && !session?.user) {
    return <MarketingLanding />;
  }

  const params = await searchParams;
  const user = await getSessionUser();
  const page = Math.max(1, Number(params.page) || 1);
  const savedFilterState = user
    ? await getUserFilterState(user.id, user.orgId)
    : undefined;

  const urlParams = new URLSearchParams();
  if (params.sources !== undefined) urlParams.set("sources", params.sources);
  if (params.lines !== undefined) urlParams.set("lines", params.lines);
  if (params.regions !== undefined) urlParams.set("regions", params.regions);
  if (params.countries !== undefined) {
    urlParams.set("countries", params.countries);
  }

  const filterState = savedFilterState
    ? mergeFilterStateWithUrl(savedFilterState, urlParams)
    : undefined;

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

  const orgId = user?.orgId;
  const [paginated, stats] = await Promise.all([
    getTendersPaginated(queryFilters, orgId),
    getDashboardStats(queryFilters, orgId),
  ]);

  let onboardingProgress = null;
  if (user?.role === "super_admin" && user.orgId) {
    const context = await getOnboardingContext(user.orgId);
    onboardingProgress = computeOnboardingProgress(context.state, context.signals);
  }

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
      initialCatalogFilters={{
        sourceIds: filterState?.sourceIds ?? [],
        serviceLineIds: filterState?.serviceLineIds ?? [],
        regionIds: filterState?.regionIds ?? [],
        countryIds: filterState?.countryIds ?? [],
      }}
      userRole={user?.role ?? "viewer"}
      onboardingProgress={onboardingProgress}
    />
  );
}
