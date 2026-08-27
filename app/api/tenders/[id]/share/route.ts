import { NextResponse } from "next/server";

import { canShareTenders } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { getTransactionalEmailConfig } from "@/lib/email/config";
import { getOrCreateTenderShareLink } from "@/lib/tenders/share";
import { requireOrgFeature } from "@/lib/tenant/features";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const user = await requireSessionUser();
    if (!canShareTenders(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    await requireOrgFeature("publicShare");
    const { id } = await context.params;
    const tenderId = Number(id);

    if (!Number.isFinite(tenderId)) {
      return NextResponse.json({ error: "Invalid tender id" }, { status: 400 });
    }

    const config = getTransactionalEmailConfig();
    const appUrl = config?.appUrl ?? process.env.APP_URL ?? "http://localhost:3000";

    const result = await getOrCreateTenderShareLink({
      tenderId,
      createdById: user.id,
      appUrl,
    });

    return NextResponse.json({
      shareUrl: result.shareUrl,
      expiresAt: result.expiresAt.toISOString(),
      created: result.created,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FEATURE_DISABLED") {
      return NextResponse.json(
        { error: "Sharing is disabled for this workspace" },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create share link" },
      { status: 500 },
    );
  }
}
