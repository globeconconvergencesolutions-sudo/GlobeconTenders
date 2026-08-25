import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import {
  canActorAssignRole,
  canActorManageTarget,
} from "@/lib/auth/user-management";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users, type UserRole } from "@/lib/db/schema";
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

    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      !canActorManageTarget(
        { id: actor.id, role: actor.role },
        { id: target.id, role: target.role as UserRole },
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

    const updates: Partial<{
      name: string;
      role: UserRole;
      isActive: boolean;
      passwordHash: string;
      updatedAt: Date;
    }> = { updatedAt: new Date() };

    if (payload.name) updates.name = payload.name.trim();
    if (payload.role) updates.role = payload.role;
    if (typeof payload.isActive === "boolean") updates.isActive = payload.isActive;
    if (payload.password) {
      updates.passwordHash = await bcrypt.hash(payload.password, 12);
    }

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        passwordHash: users.passwordHash,
      });

    if (updated) {
      const { ensureBetterAuthUser } = await import(
        "@/lib/auth/ensure-better-auth-user"
      );
      await ensureBetterAuthUser({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        passwordHash: updated.passwordHash,
      });
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
      user: updated
        ? {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            role: updated.role,
            isActive: updated.isActive,
            createdAt: updated.createdAt,
          }
        : updated,
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

    const [target] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (
      !canActorManageTarget(
        { id: actor.id, role: actor.role },
        { id: target.id, role: target.role as UserRole },
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
