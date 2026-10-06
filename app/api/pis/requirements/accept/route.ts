import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { opportunityRequirements } from "@/lib/db/schema";
import { requirePisEditor } from "@/lib/pis/guard";

const schema = z.object({ id: z.number().int().positive() });

export async function POST(request: Request) {
  try {
    const { db, orgId } = await requirePisEditor();
    const body = schema.parse(await request.json());
    const [row] = await db
      .select({ id: opportunityRequirements.id })
      .from(opportunityRequirements)
      .where(
        and(eq(opportunityRequirements.id, body.id), eq(opportunityRequirements.orgId, orgId)),
      )
      .limit(1);
    if (!row) throw new Error("NOT_FOUND");
    await db
      .update(opportunityRequirements)
      .set({
        reviewState: "accepted",
        evidenceNote:
          "Accepted by a person. Run the assessment again before this line changes the score. It is not marked verified.",
      })
      .where(eq(opportunityRequirements.id, row.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
