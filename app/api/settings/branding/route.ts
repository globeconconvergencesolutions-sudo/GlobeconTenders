import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSettingsManage } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";
import { resolveBranding } from "@/lib/branding/resolve";
import { deleteCloudinaryImage } from "@/lib/cloudinary";
import type { WorkspaceBrandingSettings } from "@/lib/db/schema";
import {
  getWorkspaceSettings,
  updateWorkspaceBranding,
} from "@/lib/settings/workspace";

const optionalUrl = z.string().url().or(z.literal("")).optional();

const patchSchema = z.object({
  displayName: z.string().trim().min(1).max(120).optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #2563eb")
    .optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use a hex color like #1d4ed8")
    .optional(),
  logoUrl: optionalUrl,
  coverUrl: optionalUrl,
  clearLogo: z.boolean().optional(),
  clearCover: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);

    const workspace = await getWorkspaceSettings();
    const branding = resolveBranding({
      organizationName: workspace.organizationName,
      branding: workspace.branding,
      lexicon: workspace.lexicon,
    });

    return NextResponse.json({
      branding: workspace.branding,
      resolved: branding,
      organizationName: workspace.organizationName,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);

    const payload = patchSchema.parse(await request.json());
    const current = await getWorkspaceSettings();

    const next: WorkspaceBrandingSettings = {
      ...current.branding,
    };

    if (payload.displayName !== undefined) {
      next.displayName = payload.displayName;
    }
    if (payload.primaryColor !== undefined) {
      next.primaryColor = payload.primaryColor;
    }
    if (payload.accentColor !== undefined) {
      next.accentColor = payload.accentColor;
    }

    const orphanIds: string[] = [];

    if (payload.clearLogo) {
      if (next.logoPublicId) orphanIds.push(next.logoPublicId);
      delete next.logoUrl;
      delete next.logoPublicId;
    } else if (payload.logoUrl !== undefined) {
      // Manual URL replaces hosted asset — drop previous Cloudinary id
      if (payload.logoUrl.trim() === "") {
        if (next.logoPublicId) orphanIds.push(next.logoPublicId);
        delete next.logoUrl;
        delete next.logoPublicId;
      } else if (payload.logoUrl !== next.logoUrl) {
        if (next.logoPublicId) orphanIds.push(next.logoPublicId);
        next.logoUrl = payload.logoUrl;
        delete next.logoPublicId;
      }
    }

    if (payload.clearCover) {
      if (next.coverPublicId) orphanIds.push(next.coverPublicId);
      delete next.coverUrl;
      delete next.coverPublicId;
    } else if (payload.coverUrl !== undefined) {
      if (payload.coverUrl.trim() === "") {
        if (next.coverPublicId) orphanIds.push(next.coverPublicId);
        delete next.coverUrl;
        delete next.coverPublicId;
      } else if (payload.coverUrl !== next.coverUrl) {
        if (next.coverPublicId) orphanIds.push(next.coverPublicId);
        next.coverUrl = payload.coverUrl;
        delete next.coverPublicId;
      }
    }

    const saved = await updateWorkspaceBranding(next, user.id);

    for (const id of orphanIds) {
      void deleteCloudinaryImage(id);
    }

    return NextResponse.json({
      branding: saved,
      resolved: resolveBranding({
        organizationName: current.organizationName,
        branding: saved,
        lexicon: current.lexicon,
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 },
    );
  }
}
