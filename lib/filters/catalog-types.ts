import type { FilterState, UserRole } from "@/lib/db/schema";

export type FilterCatalogResponse = {
  sources: Array<{
    id: number;
    name: string;
    color: string;
    type: string;
    isBuiltIn?: boolean;
  }>;
  serviceLines: Array<{ id: number; name: string; isBuiltIn?: boolean }>;
  archivedSources: Array<{
    id: number;
    name: string;
    color: string;
    type: string;
    isBuiltIn?: boolean;
  }>;
  archivedServiceLines: Array<{
    id: number;
    name: string;
    isBuiltIn?: boolean;
  }>;
  regions: Array<{ id: number; name: string }>;
  countries: Array<{
    id: number;
    name: string;
    regionId: number;
    regionName: string;
  }>;
  filterState: FilterState;
  role: UserRole;
  permissions?: {
    manageSources: boolean;
    manageServiceLines: boolean;
  };
};

export type FilterChip = {
  id: string;
  key: "sourceIds" | "serviceLineIds" | "regionIds" | "countryIds";
  valueId: number;
  label: string;
  color?: string;
};

export function buildFilterChips(
  catalog: FilterCatalogResponse,
): FilterChip[] {
  const { filterState, sources, serviceLines, regions, countries } = catalog;
  const chips: FilterChip[] = [];

  for (const id of filterState.sourceIds) {
    const source = sources.find((item) => item.id === id);
    if (!source) continue;
    chips.push({
      id: `source-${id}`,
      key: "sourceIds",
      valueId: id,
      label: source.name,
      color: source.color,
    });
  }

  for (const id of filterState.serviceLineIds) {
    const line = serviceLines.find((item) => item.id === id);
    if (!line) continue;
    chips.push({
      id: `service-${id}`,
      key: "serviceLineIds",
      valueId: id,
      label: line.name,
    });
  }

  for (const id of filterState.regionIds) {
    const region = regions.find((item) => item.id === id);
    if (!region) continue;
    chips.push({
      id: `region-${id}`,
      key: "regionIds",
      valueId: id,
      label: region.name,
    });
  }

  for (const id of filterState.countryIds) {
    const country = countries.find((item) => item.id === id);
    if (!country) continue;
    chips.push({
      id: `country-${id}`,
      key: "countryIds",
      valueId: id,
      label: country.name,
    });
  }

  return chips;
}
