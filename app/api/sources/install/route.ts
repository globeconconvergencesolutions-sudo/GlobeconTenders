import { NextResponse } from "next/server";
import { z } from "zod";

import { canCreateSources } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import {
  installAllCatalogSources,
  installCatalogSource,
  installFeaturedCatalogSources,
} from "@/lib/sources/install";

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

    if (payload.all) {
      const results = await installAllCatalogSources(user.id);
      return NextResponse.json({ results });
    }

    if (payload.featured) {
      const results = await installFeaturedCatalogSources(user.id);
      return NextResponse.json({ results });
    }

    if (payload.catalogId) {
      const result = await installCatalogSource(payload.catalogId, user.id, {
        sync,
      });
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Install failed" },
      { status: 500 },
    );
  }
}
