import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSettingsManage } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";
import { resolveBranding } from "@/lib/branding/resolve";
import {
  deleteCloudinaryImage,
  isCloudinaryConfigured,
  uploadBrandingImage,
} from "@/lib/cloudinary";
import type { WorkspaceBrandingSettings } from "@/lib/db/schema";
import {
  getWorkspaceSettings,
  updateWorkspaceBranding,
} from "@/lib/settings/workspace";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // 4MB
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
]);

const kindSchema = z.enum(["logo", "cover"]);

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);

    if (!isCloudinaryConfigured()) {
      return NextResponse.json(
        { error: "Image upload is not configured yet" },
        { status: 503 },
      );
    }

    const formData = await request.formData();
    const kindRaw = String(formData.get("kind") ?? "");
    const kind = kindSchema.parse(kindRaw);
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Use PNG, JPG, WebP, or SVG" },
        { status: 400 },
      );
    }

    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be under 4MB" },
        { status: 400 },
      );
    }

    const current = await getWorkspaceSettings(user.orgId);
    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadBrandingImage(
      buffer,
      file.name,
      user.orgSlug || `org-${user.orgId}`,
      kind,
    );

    const previousPublicId =
      kind === "logo"
        ? current.branding.logoPublicId
        : current.branding.coverPublicId;

    const next: WorkspaceBrandingSettings = {
      ...current.branding,
      ...(kind === "logo"
        ? {
            logoUrl: uploaded.secureUrl,
            logoPublicId: uploaded.publicId,
          }
        : {
            coverUrl: uploaded.secureUrl,
            coverPublicId: uploaded.publicId,
          }),
    };

    const saved = await updateWorkspaceBranding(next, user.id, user.orgId);

    if (previousPublicId && previousPublicId !== uploaded.publicId) {
      void deleteCloudinaryImage(previousPublicId);
    }

    return NextResponse.json({
      branding: saved,
      resolved: resolveBranding({
        organizationName: current.organizationName,
        branding: saved,
        lexicon: current.lexicon,
      }),
      uploaded: {
        kind,
        url: uploaded.secureUrl,
        publicId: uploaded.publicId,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid upload kind" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("[branding/upload] failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);

    const body = await request.json().catch(() => ({}));
    const kind = kindSchema.parse(body.kind);

    const current = await getWorkspaceSettings(user.orgId);
    const publicId =
      kind === "logo"
        ? current.branding.logoPublicId
        : current.branding.coverPublicId;

    const next: WorkspaceBrandingSettings = { ...current.branding };
    if (kind === "logo") {
      delete next.logoUrl;
      delete next.logoPublicId;
    } else {
      delete next.coverUrl;
      delete next.coverPublicId;
    }

    const saved = await updateWorkspaceBranding(next, user.id, user.orgId);
    if (publicId) void deleteCloudinaryImage(publicId);

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
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Remove failed" },
      { status: 500 },
    );
  }
}
