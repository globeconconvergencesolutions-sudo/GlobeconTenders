import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { opportunityRelations } from "@/lib/db/schema";
import { requirePisEditor } from "@/lib/pis/guard";

const schema = z.object({
  id: z.number().int().positive(),
  status: z.enum(["confirmed", "dismissed"]),
});

export async function POST(request: Request) {
  try {
    const { db, orgId } = await requirePisEditor();
    const body = schema.parse(await request.json());
    const [row] = await db
      .select({ id: opportunityRelations.id })
      .from(opportunityRelations)
      .where(and(eq(opportunityRelations.id, body.id), eq(opportunityRelations.orgId, orgId)))
      .limit(1);
    if (!row) throw new Error("NOT_FOUND");
    await db
      .update(opportunityRelations)
      .set({ status: body.status })
      .where(eq(opportunityRelations.id, row.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
