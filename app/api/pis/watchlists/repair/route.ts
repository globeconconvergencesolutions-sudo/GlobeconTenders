import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { requirePisEditor } from "@/lib/pis/guard";
import { rebuildNamedCoreWatchlist } from "@/lib/pis/taxonomy";

const schema = z.object({ id: z.number().int().positive() });

export async function POST(request: Request) {
  try {
    const { db, orgId } = await requirePisEditor();
    const body = schema.parse(await request.json());
    const count = await rebuildNamedCoreWatchlist(db, orgId, body.id);
    if (count == null) throw new Error("NOT_FOUND");
    return NextResponse.json({ ok: true, lines: count });
  } catch (error) {
    return handleApiError(error);
  }
}
