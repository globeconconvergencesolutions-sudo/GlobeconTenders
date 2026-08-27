import { headers } from "next/headers";

import { MarketingLanding } from "@/components/marketing/marketing-landing";
import { TendersDashboard } from "@/components/tenders/tenders-dashboard";
import { auth } from "@/auth";
import { getSessionUser } from "@/lib/auth/session";
import type { FilterState } from "@/lib/db/schema";
import { mergeFilterStateWithUrl } from "@/lib/filters/url-state";
import { computeOnboardingProgress } from "@/lib/onboarding/steps";
import { getOnboardingContext } from "@/lib/onboarding/workspace";
import {
  isListingBucket,
  type ListingBucket,
} from "@/lib/tenders/lifecycle";
import {
  DEFAULT_PAGE_SIZE,
  getDashboardStats,
  getTendersPaginated,
  getUserFilterState,
  type TenderSort,
} from "@/lib/tenders/queries";
import { isApexHost } from "@/lib/tenant/resolution";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams: Promise<{
    page?: string;
    q?: string;
    sort?: TenderSort;
    saved?: string;
    showClosed?: string;
    listing?: string;
    sources?: string;
    lines?: string;
    regions?: string;
    countries?: string;
  }>;
};

function resolveListingBucket(
  listingParam: string | undefined,
  showClosedParam: string | undefined,
  filterState?: FilterState,
): ListingBucket {
  if (isListingBucket(listingParam)) return listingParam;
  if (showClosedParam === "1") return "all";
  if (showClosedParam === "0") return "live";
  if (filterState?.hideClosed === false) return "all";
  return "live";
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
  const listingBucket = resolveListingBucket(
    params.listing,
    params.showClosed,
    filterState,
  );

  const queryFilters = {
    search,
    sort,
    savedOnly,
    listingBucket,
    hideClosed: listingBucket === "live",
    filterState,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
  };

  const orgId = user?.orgId;
  const emptyPage = {
    items: [] as Awaited<ReturnType<typeof getTendersPaginated>>["items"],
    total: 0,
    page,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 0,
  };
  const emptyStats = {
    matchingTenders: 0,
    closingWithin3Days: 0,
    openInDatabase: 0,
    staleListings: 0,
    archivedListings: 0,
    activeSources: 0,
    lastSynced: null as Date | null,
    trackingSources: 0,
  };

  let paginated = emptyPage;
  let stats = emptyStats;
  let onboardingProgress = null;

  const [pageResult, statsResult, onboardingResult] = await Promise.allSettled([
    getTendersPaginated(queryFilters, orgId),
    getDashboardStats(queryFilters, orgId),
    user?.role === "super_admin" && user.orgId
      ? getOnboardingContext(user.orgId)
      : Promise.resolve(null),
  ]);

  if (pageResult.status === "fulfilled") {
    paginated = pageResult.value;
  } else {
    console.error("[home] tenders query failed", pageResult.reason);
  }

  if (statsResult.status === "fulfilled") {
    stats = statsResult.value;
  } else {
    console.error("[home] stats query failed", statsResult.reason);
  }

  if (onboardingResult.status === "fulfilled" && onboardingResult.value) {
    onboardingProgress = computeOnboardingProgress(
      onboardingResult.value.state,
      onboardingResult.value.signals,
    );
  } else if (onboardingResult.status === "rejected") {
    console.error("[home] onboarding query failed", onboardingResult.reason);
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
        staleListings: stats.staleListings,
        archivedListings: stats.archivedListings,
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
      initialListingBucket={listingBucket}
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
