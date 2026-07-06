import { NextResponse } from "next/server";

import { SOURCE_CATALOG } from "@/lib/catalog/source-catalog";
import { requireSessionUser } from "@/lib/auth/session";
import { getInstalledCatalogSlugs } from "@/lib/sources/install";

export async function GET() {
  try {
    await requireSessionUser();
    const installedSlugs = await getInstalledCatalogSlugs();

    return NextResponse.json({
      catalog: SOURCE_CATALOG,
      installedIds: SOURCE_CATALOG.filter((source) =>
        installedSlugs.has(source.id),
      ).map((source) => source.id),
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
