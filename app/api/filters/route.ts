import { NextResponse } from "next/server";
import { z } from "zod";

import { hasPermission } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { EMPTY_FILTER_STATE, type FilterState } from "@/lib/db/schema";
import {
  getArchivedCatalog,
  getFilterCatalog,
  getUserFilterState,
  updateUserFilterState,
} from "@/lib/tenders/queries";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const [catalog, filterState] = await Promise.all([
      getFilterCatalog(),
      getUserFilterState(user.id),
    ]);

    const canManageSources = hasPermission(user.role, "sources:update");
    const canManageServiceLines = hasPermission(user.role, "service_lines:delete");
    const archived =
      canManageSources || canManageServiceLines
        ? await getArchivedCatalog()
        : { sources: [], serviceLines: [] };

    return NextResponse.json({
      ...catalog,
      archivedSources: canManageSources ? archived.sources : [],
      archivedServiceLines: canManageServiceLines ? archived.serviceLines : [],
      filterState,
      role: user.role,
      permissions: {
        manageSources: canManageSources,
        manageServiceLines: canManageServiceLines,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

const filterSchema = z.object({
  sourceIds: z.array(z.number()).optional(),
  serviceLineIds: z.array(z.number()).optional(),
  regionIds: z.array(z.number()).optional(),
  countryIds: z.array(z.number()).optional(),
  search: z.string().optional(),
  sort: z.enum(["closing_soonest", "recently_issued"]).optional(),
  savedOnly: z.boolean().optional(),
  hideClosed: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    const body = filterSchema.parse(await request.json());
    const current = await getUserFilterState(user.id);
    const next = {
      sourceIds: body.sourceIds ?? current.sourceIds,
      serviceLineIds: body.serviceLineIds ?? current.serviceLineIds,
      regionIds: body.regionIds ?? current.regionIds,
      countryIds: body.countryIds ?? current.countryIds,
      search: body.search ?? current.search,
      sort: body.sort ?? current.sort,
      savedOnly: body.savedOnly ?? current.savedOnly,
      hideClosed: body.hideClosed ?? current.hideClosed,
    };
    await updateUserFilterState(user.id, next);
    return NextResponse.json({ filterState: next });
  } catch (error) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function DELETE() {
  try {
    const user = await requireSessionUser();
    const next: FilterState = {
      ...EMPTY_FILTER_STATE,
      hideClosed: true,
      savedOnly: false,
    };
    await updateUserFilterState(user.id, next);
    return NextResponse.json({ filterState: next, cleared: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
