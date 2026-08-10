import { NextResponse } from "next/server";
import { z } from "zod";

import { canCreateSources } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import {
  installAllCatalogSources,
  installCatalogSource,
  installFeaturedCatalogSources,
} from "@/lib/sources/install";
import { handleApiError } from "@/lib/api/errors";
import { assertCanAddSource } from "@/lib/platform/limits";

const installSchema = z
  .object({
    catalogId: z.string().optional(),
    featured: z.boolean().optional(),
    all: z.boolean().optional(),
    sync: z.boolean().optional(),
  })
  .refine(
    (value) => Boolean(value.catalogId || value.featured || value.all),
    { message: "Provide catalogId, featured, or all" },
  );

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canCreateSources(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const payload = installSchema.parse(await request.json());
    const sync = payload.sync !== false;

    if (payload.catalogId) {
      await assertCanAddSource(user.orgId);
      const result = await installCatalogSource(
        payload.catalogId,
        user.orgId,
        user.id,
        { sync },
      );
      return NextResponse.json({ result });
    }

    if (payload.all) {
      const results = await installAllCatalogSources(user.orgId, user.id);
      return NextResponse.json({ results });
    }

    if (payload.featured) {
      await assertCanAddSource(user.orgId);
      const results = await installFeaturedCatalogSources(user.orgId, user.id);
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    return handleApiError(error, "Install failed");
  }
}
