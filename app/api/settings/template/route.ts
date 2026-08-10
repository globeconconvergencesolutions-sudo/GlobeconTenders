import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSettingsManage } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";
import { getWorkspaceSettings } from "@/lib/settings/workspace";
import {
  reapplyTemplateSections,
  type TemplateApplySection,
} from "@/lib/templates/apply";
import { loadTemplate } from "@/lib/templates/load";
import { requireCurrentOrg } from "@/lib/tenant/context";

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);

    const org = await requireCurrentOrg();
    const [settings, template] = await Promise.all([
      getWorkspaceSettings(org.id),
      Promise.resolve(loadTemplate(org.templateId)),
    ]);

    return NextResponse.json({
      orgTemplateId: org.templateId,
      orgTemplateVersion: org.templateVersion,
      template: {
        id: template.id,
        version: template.version,
        name: template.name,
        description: template.description,
      },
      features: settings.features,
      layout: settings.layout,
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

const reapplySchema = z.object({
  sections: z
    .array(
      z.enum(["lexicon", "branding", "features", "layout", "catalog"]),
    )
    .min(1),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);

    const org = await requireCurrentOrg();
    const settings = await getWorkspaceSettings(org.id);
    const payload = reapplySchema.parse(await request.json());

    await reapplyTemplateSections({
      orgId: org.id,
      templateId: org.templateId,
      organizationName: settings.organizationName,
      sections: payload.sections as TemplateApplySection[],
      updatedById: user.id,
    });

    return NextResponse.json({ ok: true });
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
      { error: error instanceof Error ? error.message : "Reapply failed" },
      { status: 500 },
    );
  }
}
