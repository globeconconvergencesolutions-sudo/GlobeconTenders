import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { orgHiddenCatalogLines, watchlistLines, watchlists } from "@/lib/db/schema";
import { requirePisAdmin } from "@/lib/pis/guard";

const schema = z.object({
  lineId: z.number().int().positive(),
  hidden: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const { db, orgId } = await requirePisAdmin();
    const body = schema.parse(await request.json());
    if (body.hidden) {
      await db
        .insert(orgHiddenCatalogLines)
        .values({ orgId, catalogServiceLineId: body.lineId })
        .onConflictDoNothing();
      const lists = await db
        .select({ id: watchlists.id })
        .from(watchlists)
        .where(eq(watchlists.orgId, orgId));
      if (lists.length > 0) {
        for (const list of lists) {
          await db
            .delete(watchlistLines)
            .where(
              and(
                eq(watchlistLines.watchlistId, list.id),
                eq(watchlistLines.catalogServiceLineId, body.lineId),
              ),
            );
        }
      }
    } else {
      await db
        .delete(orgHiddenCatalogLines)
        .where(
          and(
            eq(orgHiddenCatalogLines.orgId, orgId),
            eq(orgHiddenCatalogLines.catalogServiceLineId, body.lineId),
          ),
        );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
