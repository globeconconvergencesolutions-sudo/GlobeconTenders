import { NextResponse } from "next/server";
import { z } from "zod";

import { hasPermission } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { serviceLines } from "@/lib/db/schema";
import { slugify } from "@/lib/matching";

const schema = z.object({
  name: z.string().min(2).max(120),
  keywords: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!hasPermission(user.role, "service_lines:create")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    const payload = schema.parse(await request.json());
    const slug = slugify(payload.name);
    const keywords = payload.keywords?.length
      ? payload.keywords
      : [payload.name.toLowerCase()];

    const [created] = await db
      .insert(serviceLines)
      .values({
        orgId: user.orgId,
        name: payload.name,
        slug,
        keywords,
        isBuiltIn: false,
        createdById: user.id,
      })
      .returning();

    return NextResponse.json({ serviceLine: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
