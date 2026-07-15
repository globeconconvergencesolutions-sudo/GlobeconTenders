import { NextResponse } from "next/server";
import { z } from "zod";

import { requireNotificationSettingsAccess } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/db/schema";
import { listAlertRecipients } from "@/lib/settings/recipients";
import {
  getWorkspaceSettings,
  updateWorkspaceNotifications,
} from "@/lib/settings/workspace";

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  includedUserIds: z.array(z.number().int().positive()).optional(),
  respectUserOptOut: z.boolean().optional(),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireNotificationSettingsAccess(user.id, user.role);

    const [workspace, roster] = await Promise.all([
      getWorkspaceSettings(),
      listAlertRecipients(),
    ]);

    return NextResponse.json({
      notifications: workspace.notifications,
      organizationName: workspace.organizationName,
      ...roster,
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
    await requireNotificationSettingsAccess(user.id, user.role);

    const payload = patchSchema.parse(await request.json());
    const current = await getWorkspaceSettings();

    const next = {
      ...current.notifications,
      mode: "explicit_list" as const,
      defaultPrefs:
        current.notifications.defaultPrefs ?? DEFAULT_NOTIFICATION_PREFS,
      ...(typeof payload.enabled === "boolean"
        ? { enabled: payload.enabled }
        : {}),
      ...(payload.includedUserIds
        ? { includedUserIds: payload.includedUserIds }
        : {}),
      ...(typeof payload.respectUserOptOut === "boolean"
        ? { respectUserOptOut: payload.respectUserOptOut }
        : {}),
    };

    const saved = await updateWorkspaceNotifications(next, user.id);

    return NextResponse.json({ notifications: saved });
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
