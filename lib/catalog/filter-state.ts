import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  EMPTY_FILTER_STATE,
  orgMemberships,
  type FilterState,
} from "@/lib/db/schema";

type FilterKey = "sourceIds" | "serviceLineIds";

/**
 * When catalog items are archived/deleted, strip their IDs from every
 * membership filter in that org (not the global users.filter_state).
 */
export async function removeIdsFromAllUserFilters(
  key: FilterKey,
  ids: number[],
  orgId?: number,
) {
  const db = getDb();
  if (!db || ids.length === 0) return;

  const idSet = new Set(ids);
  const rows = orgId
    ? await db
        .select({
          id: orgMemberships.id,
          filterState: orgMemberships.filterState,
        })
        .from(orgMemberships)
        .where(eq(orgMemberships.orgId, orgId))
    : await db
        .select({
          id: orgMemberships.id,
          filterState: orgMemberships.filterState,
        })
        .from(orgMemberships);

  for (const row of rows) {
    const current = row.filterState ?? EMPTY_FILTER_STATE;
    const nextValues = (current[key] ?? []).filter((id) => !idSet.has(id));
    if (nextValues.length === (current[key] ?? []).length) continue;

    const next: FilterState = { ...current, [key]: nextValues };
    await db
      .update(orgMemberships)
      .set({ filterState: next })
      .where(eq(orgMemberships.id, row.id));
  }
}

export function stripIdsFromFilterState(
  filterState: FilterState,
  key: FilterKey,
  ids: number[],
): FilterState {
  if (ids.length === 0) return filterState;
  const idSet = new Set(ids);
  return {
    ...filterState,
    [key]: filterState[key].filter((id) => !idSet.has(id)),
  };
}
