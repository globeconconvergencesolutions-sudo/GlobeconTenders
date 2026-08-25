import type { FilterState } from "@/lib/db/schema";
import { EMPTY_FILTER_STATE } from "@/lib/db/schema";

/** URL keys for shareable catalog filters (comma-separated numeric ids). */
export const CATALOG_FILTER_URL_KEYS = {
  sourceIds: "sources",
  serviceLineIds: "lines",
  regionIds: "regions",
  countryIds: "countries",
} as const;

export type CatalogFilterKey = keyof typeof CATALOG_FILTER_URL_KEYS;

function parseIdList(raw: string | null): number[] | undefined {
  if (raw === null) return undefined;
  if (raw.trim() === "") return [];
  return raw
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
}

function serializeIdList(ids: number[]): string {
  return ids.filter((id) => Number.isFinite(id) && id > 0).join(",");
}

export function hasCatalogFilterParams(
  searchParams: URLSearchParams | { get: (key: string) => string | null },
): boolean {
  return Object.values(CATALOG_FILTER_URL_KEYS).some(
    (key) => searchParams.get(key) !== null,
  );
}

/**
 * Merge saved DB filter defaults with optional URL catalog overrides.
 * Missing URL keys keep the DB value; present keys (even empty) win.
 */
export function mergeFilterStateWithUrl(
  saved: FilterState,
  searchParams: URLSearchParams | { get: (key: string) => string | null },
): FilterState {
  const sourceIds = parseIdList(searchParams.get(CATALOG_FILTER_URL_KEYS.sourceIds));
  const serviceLineIds = parseIdList(
    searchParams.get(CATALOG_FILTER_URL_KEYS.serviceLineIds),
  );
  const regionIds = parseIdList(searchParams.get(CATALOG_FILTER_URL_KEYS.regionIds));
  const countryIds = parseIdList(
    searchParams.get(CATALOG_FILTER_URL_KEYS.countryIds),
  );

  return {
    ...EMPTY_FILTER_STATE,
    ...saved,
    sourceIds: sourceIds ?? saved.sourceIds ?? [],
    serviceLineIds: serviceLineIds ?? saved.serviceLineIds ?? [],
    regionIds: regionIds ?? saved.regionIds ?? [],
    countryIds: countryIds ?? saved.countryIds ?? [],
  };
}

/** Write catalog filter ids into a URLSearchParams (mutates). */
export function writeCatalogFiltersToSearchParams(
  params: URLSearchParams,
  catalog: Pick<
    FilterState,
    "sourceIds" | "serviceLineIds" | "regionIds" | "countryIds"
  >,
): void {
  params.set(
    CATALOG_FILTER_URL_KEYS.sourceIds,
    serializeIdList(catalog.sourceIds ?? []),
  );
  params.set(
    CATALOG_FILTER_URL_KEYS.serviceLineIds,
    serializeIdList(catalog.serviceLineIds ?? []),
  );
  params.set(
    CATALOG_FILTER_URL_KEYS.regionIds,
    serializeIdList(catalog.regionIds ?? []),
  );
  params.set(
    CATALOG_FILTER_URL_KEYS.countryIds,
    serializeIdList(catalog.countryIds ?? []),
  );
}

/** Clear catalog filter keys from the URL (session returns to saved defaults). */
export function clearCatalogFiltersFromSearchParams(
  params: URLSearchParams,
): void {
  for (const key of Object.values(CATALOG_FILTER_URL_KEYS)) {
    params.delete(key);
  }
}

/** Explicit empty catalog selection in the URL (show all, ignore saved defaults). */
export function writeEmptyCatalogFiltersToSearchParams(
  params: URLSearchParams,
): void {
  writeCatalogFiltersToSearchParams(params, {
    sourceIds: [],
    serviceLineIds: [],
    regionIds: [],
    countryIds: [],
  });
}
