import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { opportunityNotes, tenders } from "@/lib/db/schema";
import { requirePisEditor } from "@/lib/pis/guard";

const schema = z.object({
  tenderId: z.number().int().positive(),
  body: z.string().min(2).max(4000),
});

export async function POST(request: Request) {
  try {
    const { db, orgId, user } = await requirePisEditor();
    const body = schema.parse(await request.json());
    const [tender] = await db
      .select({ id: tenders.id })
      .from(tenders)
      .where(and(eq(tenders.id, body.tenderId), eq(tenders.orgId, orgId)))
      .limit(1);
    if (!tender) throw new Error("NOT_FOUND");
    await db.insert(opportunityNotes).values({
      orgId,
      tenderId: body.tenderId,
      authorId: user.id,
      body: body.body,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
