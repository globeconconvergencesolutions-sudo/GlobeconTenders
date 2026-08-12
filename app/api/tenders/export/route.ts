import { NextResponse } from "next/server";

import { hasPermission } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { tendersToCsv } from "@/lib/export/csv";
import {
  getTendersForExport,
  getUserFilterState,
  type TenderSort,
} from "@/lib/tenders/queries";
import { requireOrgFeature } from "@/lib/tenant/features";

function resolveQueryFilters(
  searchParams: URLSearchParams,
  filterState: Awaited<ReturnType<typeof getUserFilterState>>,
) {
  const showClosed = searchParams.get("showClosed");
  const saved = searchParams.get("saved");

  return {
    search: searchParams.get("q") ?? filterState.search,
    sort:
      (searchParams.get("sort") as TenderSort | null) ??
      filterState.sort ??
      "closing_soonest",
    savedOnly:
      saved === "1" || (saved === null && Boolean(filterState.savedOnly)),
    hideClosed:
      showClosed === "1"
        ? false
        : showClosed === "0"
          ? true
          : (filterState.hideClosed ?? true),
    filterState,
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!hasPermission(user.role, "tenders:export")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await requireOrgFeature("export");

    const { searchParams } = new URL(request.url);
    const filterState = await getUserFilterState(user.id, user.orgId);
    const rows = await getTendersForExport(
      resolveQueryFilters(searchParams, filterState),
      user.orgId,
    );

    const csv = tendersToCsv(rows);
    const filename = `${user.orgSlug || "workspace"}-tenders-${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FEATURE_DISABLED") {
      return NextResponse.json({ error: "Export is disabled for this workspace" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Export failed" },
      { status: 500 },
    );
  }
}
