import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { requireSettingsManage } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import {
  grantUserPermission,
  listNotificationDelegates,
  revokeUserPermission,
} from "@/lib/settings/workspace";

const grantSchema = z.object({
  userId: z.number().int().positive(),
  permission: z.literal("settings:notifications"),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);

    const delegates = await listNotificationDelegates();
    return NextResponse.json({ delegates });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireSessionUser();
    await requireSettingsManage(actor.id, actor.role);

    const payload = grantSchema.parse(await request.json());
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const [target] = await db
      .select({ id: users.id, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);

    if (!target?.isActive) {
      return NextResponse.json({ error: "User not found or inactive" }, { status: 404 });
    }

    const grant = await grantUserPermission({
      userId: payload.userId,
      permission: payload.permission,
      grantedById: actor.id,
    });

    if (!grant) {
      return NextResponse.json(
        { error: "This user already has that access" },
        { status: 409 },
      );
    }

    return NextResponse.json({ grant }, { status: 201 });
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
    return NextResponse.json({ error: "Grant failed" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireSessionUser();
    await requireSettingsManage(actor.id, actor.role);

    const { searchParams } = new URL(request.url);
    const grantId = Number(searchParams.get("id"));
    if (!Number.isFinite(grantId)) {
      return NextResponse.json({ error: "Invalid grant id" }, { status: 400 });
    }

    await revokeUserPermission(grantId);
    return NextResponse.json({ revoked: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Revoke failed" }, { status: 500 });
  }
}
