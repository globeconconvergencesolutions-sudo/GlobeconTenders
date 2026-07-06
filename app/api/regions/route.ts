import { NextResponse } from "next/server";
import { z } from "zod";

import { hasPermission } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { countries, regions } from "@/lib/db/schema";
import { slugify } from "@/lib/matching";

const regionSchema = z.object({
  name: z.string().min(2).max(120),
  keywords: z.array(z.string()).optional(),
});

const countrySchema = z.object({
  name: z.string().min(2).max(120),
  regionId: z.number(),
  keywords: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!hasPermission(user.role, "regions:create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const body = await request.json();

    if ("regionId" in body) {
      const payload = countrySchema.parse(body);
      const [created] = await db
        .insert(countries)
        .values({
          name: payload.name,
          slug: slugify(payload.name),
          regionId: payload.regionId,
          keywords: payload.keywords?.length
            ? payload.keywords
            : [payload.name],
          isBuiltIn: false,
          createdById: user.id,
        })
        .returning();
      return NextResponse.json({ country: created }, { status: 201 });
    }

    const payload = regionSchema.parse(body);
    const [created] = await db
      .insert(regions)
      .values({
        name: payload.name,
        slug: slugify(payload.name),
        keywords: payload.keywords?.length ? payload.keywords : [payload.name],
        isBuiltIn: false,
        createdById: user.id,
      })
      .returning();

    return NextResponse.json({ region: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
