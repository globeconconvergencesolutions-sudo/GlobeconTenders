import type { FilterState } from "@/lib/db/schema";

export function countSidebarFilters(state: FilterState): number {
  return (
    state.sourceIds.length +
    state.serviceLineIds.length +
    state.regionIds.length +
    state.countryIds.length
  );
}

export function hasSidebarFilters(state: FilterState): boolean {
  return countSidebarFilters(state) > 0;
}
