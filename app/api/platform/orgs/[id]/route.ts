import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { requirePlatformAdmin } from "@/lib/auth/session";
import { deleteOrganizationForPlatform } from "@/lib/platform/delete-org";
import {
  getOrganizationForPlatform,
  updateOrganizationForPlatform,
} from "@/lib/platform/update-org";
import { getPlanDefinition, isPlanId } from "@/lib/platform/plans";

const patchSchema = z.object({
  status: z.enum(["active", "suspended", "trial_expired"]).optional(),
  plan: z.string().optional(),
});

const deleteSchema = z.object({
  confirmSlug: z.string().min(1),
});

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { id } = await context.params;
    const orgId = Number(id);
    if (!Number.isFinite(orgId)) {
      return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
    }

    const org = await getOrganizationForPlatform(orgId);
    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    return NextResponse.json({
      organization: {
        ...org,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
        trialEndsAt: org.trialEndsAt?.toISOString() ?? null,
      },
      plan: getPlanDefinition(org.plan),
    });
  } catch (error) {
    return handleApiError(error, "Failed to load organization");
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { id } = await context.params;
    const orgId = Number(id);
    if (!Number.isFinite(orgId)) {
      return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
    }

    const payload = patchSchema.parse(await request.json());
    if (payload.plan && !isPlanId(payload.plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const result = await updateOrganizationForPlatform(orgId, {
      status: payload.status,
      plan: payload.plan as Parameters<typeof updateOrganizationForPlatform>[1]["plan"],
    });

    return NextResponse.json({
      organization: {
        ...result.organization,
        createdAt: result.organization.createdAt.toISOString(),
        updatedAt: result.organization.updatedAt.toISOString(),
        trialEndsAt: result.organization.trialEndsAt?.toISOString() ?? null,
      },
      plan: result.plan,
    });
  } catch (error) {
    return handleApiError(error, "Failed to update organization");
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requirePlatformAdmin();
    const { id } = await context.params;
    const orgId = Number(id);
    if (!Number.isFinite(orgId)) {
      return NextResponse.json({ error: "Invalid organization id" }, { status: 400 });
    }

    const payload = deleteSchema.parse(await request.json());
    const result = await deleteOrganizationForPlatform(
      orgId,
      payload.confirmSlug,
    );

    return NextResponse.json({
      ok: true,
      organization: result.organization,
      deletedUserCount: result.deletedUserIds.length,
      cloudinaryDeleted: result.cloudinaryDeleted,
      cloudinaryErrors: result.cloudinaryErrors,
    });
  } catch (error) {
    return handleApiError(error, "Failed to delete organization");
  }
}
