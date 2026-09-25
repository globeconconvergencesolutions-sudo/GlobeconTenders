import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { hasPermission } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { tenders } from "@/lib/db/schema";
import {
  applyRelevanceGate,
  resolveListingFields,
  type RelevanceOverride,
} from "@/lib/tenders/lifecycle";
import { getWorkspaceSettings } from "@/lib/settings/workspace";

const patchSchema = z
  .object({
    saved: z.boolean().optional(),
    relevanceOverride: z.enum(["include", "exclude"]).nullable().optional(),
  })
  .refine(
    (value) => value.saved !== undefined || value.relevanceOverride !== undefined,
    { message: "No changes provided" },
  );

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    const db = getDb();
    if (!db) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 },
      );
    }

    const { id } = await context.params;
    const tenderId = Number(id);
    if (!Number.isFinite(tenderId)) {
      return NextResponse.json({ error: "Invalid tender id" }, { status: 400 });
    }

    const payload = patchSchema.parse(await request.json());

    if (payload.saved !== undefined && !hasPermission(user.role, "tenders:save")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (
      payload.relevanceOverride !== undefined &&
      !hasPermission(user.role, "tenders:review")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [existing] = await db
      .select()
      .from(tenders)
      .where(
        and(eq(tenders.id, tenderId), eq(tenders.orgId, user.orgId)),
      )
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Tender not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = { updatedAt: new Date() };

    if (payload.saved !== undefined) {
      patch.saved = payload.saved;
    }

    if (payload.relevanceOverride !== undefined) {
      const override = payload.relevanceOverride as RelevanceOverride;
      const workspace = await getWorkspaceSettings(user.orgId);
      const baseListing = resolveListingFields({
        deadline: existing.deadline,
        sourceStatus: existing.sourceStatus,
        hasHardDeadline: existing.hasHardDeadline,
      });
      const listing = applyRelevanceGate(
        baseListing,
        existing.matchScore,
        workspace.relevance.minMatchScore,
        {
          rawScore: existing.matchScore,
          override,
        },
      );
      patch.relevanceOverride = override;
      patch.listingState = listing.listingState;
      patch.isClosed = listing.isClosed;
      patch.hasHardDeadline = listing.hasHardDeadline;
      patch.sourceStatus = listing.sourceStatus;
      patch.relevanceReason = listing.relevanceReason ?? null;
    }

    const [updated] = await db
      .update(tenders)
      .set(patch)
      .where(eq(tenders.id, tenderId))
      .returning({
        id: tenders.id,
        saved: tenders.saved,
        listingState: tenders.listingState,
        relevanceOverride: tenders.relevanceOverride,
        relevanceReason: tenders.relevanceReason,
      });

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
