import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { canActorAssignRole } from "@/lib/auth/user-management";
import { requirePermission } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users, type UserRole } from "@/lib/db/schema";
import { sendWelcomeTeamEmail } from "@/lib/email/team-notifications";

const createUserSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  role: z.enum(["super_admin", "admin", "analyst", "viewer"]),
});

export async function GET() {
  try {
    await requirePermission("users:read");
    const db = getDb();
    if (!db) {
      return NextResponse.json({ users: [] });
    }

    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);

    return NextResponse.json({ users: rows });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load users" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requirePermission("users:create");
    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const payload = createUserSchema.parse(await request.json());
    if (!canActorAssignRole(actor.role, payload.role)) {
      return NextResponse.json(
        { error: "You cannot assign that role" },
        { status: 403 },
      );
    }

    const email = payload.email.trim().toLowerCase();
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const [created] = await db
      .insert(users)
      .values({
        name: payload.name.trim(),
        email,
        passwordHash,
        role: payload.role as UserRole,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
      });

    const emailResult = await sendWelcomeTeamEmail({
      to: created.email,
      name: created.name,
      temporaryPassword: payload.password,
      role: created.role as UserRole,
      invitedBy: actor.name,
    });

    return NextResponse.json(
      {
        user: created,
        emailSent: emailResult.sent,
        ...(emailResult.error ? { emailWarning: emailResult.error } : {}),
      },
      { status: 201 },
    );
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
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 500 },
    );
  }
}