import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { createWatchlistForFields } from "@/lib/pis/calibration";
import { getOrgContext } from "@/lib/tenant/org-context";

const bodySchema = z.object({
  fieldIds: z.array(z.number().int().positive()).min(1).max(38),
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

    const created = await createWatchlistForFields(db, user.orgId, body.fieldIds, user.id);
    return NextResponse.json(created);
  } catch (error) {
    return handleApiError(error);
  }
}
