import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createOrganization,
  listOrganizationsForPlatform,
} from "@/lib/platform/orgs";
import { requirePlatformAdmin } from "@/lib/auth/session";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
  templateId: z.string().optional(),
  adminName: z.string().min(2).max(120),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
});

export async function GET() {
  try {
    await requirePlatformAdmin();
    const orgs = await listOrganizationsForPlatform();
    return NextResponse.json({
      organizations: orgs.map((org) => ({
        ...org,
        createdAt: org.createdAt.toISOString(),
      })),
    });
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
    await requirePlatformAdmin();
    const payload = createSchema.parse(await request.json());
    const result = await createOrganization(payload);

    return NextResponse.json(
      {
        organization: result.org,
        admin: result.admin,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    if (error instanceof Error && error.message === "SLUG_TAKEN") {
      return NextResponse.json({ error: "Organization slug already exists" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "EMAIL_TAKEN") {
      return NextResponse.json({ error: "Admin email already registered" }, { status: 409 });
    }
    if (error instanceof Error && error.message === "INVALID_SLUG") {
      return NextResponse.json({ error: "Invalid organization slug" }, { status: 400 });
    }
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Create failed" },
      { status: 500 },
    );
  }
}
