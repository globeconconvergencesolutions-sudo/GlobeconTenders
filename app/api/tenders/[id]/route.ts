import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { hasPermission } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { tenders } from "@/lib/db/schema";

const patchSchema = z.object({
  saved: z.boolean(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    if (!hasPermission(user.role, "tenders:save")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { id } = await context.params;
    const tenderId = Number(id);
    if (!Number.isFinite(tenderId)) {
      return NextResponse.json({ error: "Invalid tender id" }, { status: 400 });
    }

    const payload = patchSchema.parse(await request.json());

    const [updated] = await db
      .update(tenders)
      .set({ saved: payload.saved, updatedAt: new Date() })
      .where(eq(tenders.id, tenderId))
      .returning({ id: tenders.id, saved: tenders.saved });

    if (!updated) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    return NextResponse.json({ tender: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    );
  }
}
