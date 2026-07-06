import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  EMPTY_FILTER_STATE,
  users,
  type FilterState,
} from "@/lib/db/schema";

type FilterKey = "sourceIds" | "serviceLineIds";

export async function removeIdsFromAllUserFilters(
  key: FilterKey,
  ids: number[],
) {
  const db = getDb();
  if (!db || ids.length === 0) return;

  const idSet = new Set(ids);
  const rows = await db
    .select({ id: users.id, filterState: users.filterState })
    .from(users);

  for (const row of rows) {
    const current = row.filterState ?? EMPTY_FILTER_STATE;
    const nextValues = current[key].filter((id) => !idSet.has(id));
    if (nextValues.length === current[key].length) continue;

    const next: FilterState = { ...current, [key]: nextValues };
    await db
      .update(users)
      .set({ filterState: next, updatedAt: new Date() })
      .where(eq(users.id, row.id));
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
