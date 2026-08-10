import { NextResponse } from "next/server";
import { z } from "zod";

import { requireSettingsManage } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";
import type { WorkspaceLexiconSettings } from "@/lib/db/schema";
import { DEFAULT_PROCUREMENT_LEXICON } from "@/lib/lexicon";
import {
  getWorkspaceSettings,
  updateWorkspaceLexicon,
} from "@/lib/settings/workspace";

const lexiconKeySchema = z.enum(
  Object.keys(DEFAULT_PROCUREMENT_LEXICON) as [
    keyof WorkspaceLexiconSettings,
    ...(keyof WorkspaceLexiconSettings)[],
  ],
);

const patchSchema = z.record(lexiconKeySchema, z.string().trim().min(1).max(120));

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);

    const workspace = await getWorkspaceSettings();

    return NextResponse.json({
      lexicon: workspace.lexicon,
      defaults: DEFAULT_PROCUREMENT_LEXICON,
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
    const saved = await updateWorkspaceLexicon(payload, user.id);

    return NextResponse.json({ lexicon: saved });
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
