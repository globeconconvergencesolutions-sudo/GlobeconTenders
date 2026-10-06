import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { watchlists } from "@/lib/db/schema";
import { replaceWatchlistLines } from "@/lib/pis/taxonomy";
import { and, eq } from "drizzle-orm";
import { getOrgContext } from "@/lib/tenant/org-context";

const bodySchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(2).max(80),
  lineIds: z.array(z.number().int().positive()).max(2000),
  countryNames: z.array(z.string().min(2).max(80)).max(50).default([]),
  procurementTypeIds: z.array(z.number().int().positive()).max(30).default([]),
  activate: z.boolean().default(true),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!user.orgId) throw new Error("UNAUTHORIZED");
    if (user.role === "viewer") throw new Error("FORBIDDEN");
    const org = await getOrgContext();
    if (!org.features.pis) throw new Error("FEATURE_DISABLED");

    const body = bodySchema.parse(await request.json());
    const db = getDb();
    if (!db) throw new Error("Database not configured");

    let watchlistId = body.id;
    if (watchlistId) {
      const [owned] = await db
        .select({ id: watchlists.id })
        .from(watchlists)
        .where(and(eq(watchlists.id, watchlistId), eq(watchlists.orgId, user.orgId)))
        .limit(1);
      if (!owned) throw new Error("NOT_FOUND");
      await db
        .update(watchlists)
        .set({
          name: body.name,
          countryNames: body.countryNames,
          procurementTypeIds: body.procurementTypeIds,
          updatedAt: new Date(),
        })
        .where(eq(watchlists.id, watchlistId));
    } else {
      const [created] = await db
        .insert(watchlists)
        .values({
          orgId: user.orgId,
          name: body.name,
          isActive: false,
          countryNames: body.countryNames,
          procurementTypeIds: body.procurementTypeIds,
          createdById: user.id,
        })
        .returning({ id: watchlists.id });
      watchlistId = created.id;
    }

    await replaceWatchlistLines(db, watchlistId, body.lineIds);

    if (body.activate) {
      await db
        .update(watchlists)
        .set({ isActive: false })
        .where(eq(watchlists.orgId, user.orgId));
      await db
        .update(watchlists)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(watchlists.id, watchlistId));
    }

    return NextResponse.json({ id: watchlistId });
  } catch (error) {
    return handleApiError(error);
  }
}
