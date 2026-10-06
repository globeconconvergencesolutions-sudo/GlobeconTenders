import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { alertReads } from "@/lib/db/schema";
import { requirePisEditor } from "@/lib/pis/guard";

const schema = z.object({ key: z.string().min(3).max(120) });

export async function POST(request: Request) {
  try {
    const { db, orgId, user } = await requirePisEditor();
    const body = schema.parse(await request.json());
    await db
      .insert(alertReads)
      .values({ orgId, userId: user.id, alertKey: body.key })
      .onConflictDoNothing();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
