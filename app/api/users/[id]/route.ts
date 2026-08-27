import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import {
  canActorAssignRole,
  canActorManageTarget,
} from "@/lib/auth/user-management";
import { requirePermission } from "@/lib/auth/session";
import {
  getWorkspaceMember,
  persistWorkspaceMemberAccess,
} from "@/lib/auth/workspace-membership";
import { getDb } from "@/lib/db";
import { deleteUserById } from "@/lib/users/mutations";
import {
  sendDeactivatedTeamEmail,
  sendRemovedTeamEmail,
} from "@/lib/email/team-notifications";

const updateUserSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  role: z.enum(["super_admin", "admin", "analyst", "viewer"]).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).max(128).optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("users:update");
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const payload = updateUserSchema.parse(await request.json());

    const target = await getWorkspaceMember(actor.orgId, userId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      !canActorManageTarget(
        { id: actor.id, role: actor.role },
        { id: target.id, role: target.role },
      )
    ) {
      return NextResponse.json(
        {
          error:
            target.role === "super_admin"
              ? "Super admin accounts cannot be modified"
              : "You do not have permission to manage this user",
        },
        { status: 403 },
      );
    }

    if (payload.role && !canActorAssignRole(actor.role, payload.role)) {
      return NextResponse.json(
        { error: "You cannot assign that role" },
        { status: 403 },
      );
    }

    if (payload.isActive === false && target.id === actor.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }

    const passwordHash = payload.password
      ? await bcrypt.hash(payload.password, 12)
      : undefined;

    const updated = await persistWorkspaceMemberAccess({
      orgId: actor.orgId,
      userId,
      name: payload.name?.trim(),
      role: payload.role,
      isActive: payload.isActive,
      passwordHash,
    });

    if (updated) {
      const { getDb: loadDb } = await import("@/lib/db");
      const authDb = loadDb();
      if (authDb) {
        const { users } = await import("@/lib/db/schema");
        const { eq } = await import("drizzle-orm");
        const [full] = await authDb
          .select({
            id: users.id,
            email: users.email,
            name: users.name,
            passwordHash: users.passwordHash,
          })
          .from(users)
          .where(eq(users.id, updated.id))
          .limit(1);
        if (full) {
          const { ensureBetterAuthUser } = await import(
            "@/lib/auth/ensure-better-auth-user"
          );
          await ensureBetterAuthUser(full);
        }
      }
    }

    let emailSent: boolean | undefined;
    let emailWarning: string | undefined;

    if (payload.isActive === false && target.isActive) {
      const emailResult = await sendDeactivatedTeamEmail({
        to: target.email,
        name: target.name,
        actorName: actor.name,
      });
      emailSent = emailResult.sent;
      emailWarning = emailResult.error;
    }

    return NextResponse.json({
      user: updated,
      ...(typeof emailSent === "boolean"
        ? {
            emailSent,
            ...(emailWarning ? { emailWarning } : {}),
          }
        : {}),
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
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const actor = await requirePermission("users:delete");
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const { id } = await context.params;
    const userId = Number(id);
    if (!Number.isFinite(userId)) {
      return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
    }

    const target = await getWorkspaceMember(actor.orgId, userId);
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      !canActorManageTarget(
        { id: actor.id, role: actor.role },
        { id: target.id, role: target.role },
      )
    ) {
      return NextResponse.json(
        {
          error:
            target.role === "super_admin"
              ? "Super admin accounts cannot be removed"
              : "You do not have permission to remove this user",
        },
        { status: 403 },
      );
    }

    const emailResult = await sendRemovedTeamEmail({
      to: target.email,
      name: target.name,
      actorName: actor.name,
    });

    await deleteUserById(userId);

    return NextResponse.json({
      deleted: true,
      id: userId,
      email: target.email,
      emailSent: emailResult.sent,
      ...(emailResult.error ? { emailWarning: emailResult.error } : {}),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete user" },
      { status: 500 },
    );
  }
}
