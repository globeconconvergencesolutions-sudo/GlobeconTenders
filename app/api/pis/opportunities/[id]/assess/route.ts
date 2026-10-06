import { NextResponse } from "next/server";

import { handleApiError } from "@/lib/api/errors";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { assessOpportunity } from "@/lib/pis/qualify";
import { getOrgContext } from "@/lib/tenant/org-context";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireSessionUser();
    if (!user.orgId) throw new Error("UNAUTHORIZED");
    if (user.role === "viewer") throw new Error("FORBIDDEN");
    const org = await getOrgContext();
    if (!org.features.pis) throw new Error("FEATURE_DISABLED");
    const db = getDb();
    if (!db) throw new Error("Database not configured");
    const { id } = await context.params;
    const tenderId = Number(id);
    if (!Number.isFinite(tenderId)) throw new Error("NOT_FOUND");
    const assessment = await assessOpportunity(db, user.orgId, tenderId);
    return NextResponse.json({
      id: assessment.id,
      overallStatus: assessment.overallStatus,
      recommendedAction: assessment.recommendedAction,
      method: assessment.method,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
