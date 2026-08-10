import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSettingsManage } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";
import { resolveBranding } from "@/lib/branding/resolve";
import type { WorkspaceBrandingSettings } from "@/lib/db/schema";
import {
  getWorkspaceSettings,
  updateWorkspaceBranding,
} from "@/lib/settings/workspace";

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
  logoUrl: z.string().url().or(z.literal("")).optional(),
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
      ...(payload.displayName !== undefined
        ? { displayName: payload.displayName }
        : {}),
      ...(payload.primaryColor !== undefined
        ? { primaryColor: payload.primaryColor }
        : {}),
      ...(payload.accentColor !== undefined
        ? { accentColor: payload.accentColor }
        : {}),
      ...(payload.logoUrl !== undefined
        ? { logoUrl: payload.logoUrl || undefined }
        : {}),
    };

    const saved = await updateWorkspaceBranding(next, user.id);

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
