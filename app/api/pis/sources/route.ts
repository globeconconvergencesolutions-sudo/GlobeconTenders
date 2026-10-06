import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { sources } from "@/lib/db/schema";
import { requirePisAdmin, requirePisEditor } from "@/lib/pis/guard";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  url: z.string().url(),
});

const approveSchema = z.object({
  id: z.number().int().positive(),
  adapter: z.enum([
    "world-bank",
    "tender-yetu",
    "kenya-ppip",
    "afdb-procurement",
    "generic-rss",
    "generic-link",
    "document",
  ]),
  approve: z.literal(true),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (payload.approve === true) {
      const { db, orgId } = await requirePisAdmin();
      const body = approveSchema.parse(payload);
      const [row] = await db
        .select({ id: sources.id })
        .from(sources)
        .where(and(eq(sources.id, body.id), eq(sources.orgId, orgId)))
        .limit(1);
      if (!row) throw new Error("NOT_FOUND");
      await db
        .update(sources)
        .set({
          reviewStatus: "active",
          enabled: true,
          adapter: body.adapter,
        })
        .where(eq(sources.id, row.id));
      return NextResponse.json({ ok: true });
    }

    const { db, orgId, user } = await requirePisEditor();
    const body = createSchema.parse(payload);
    const slugBase = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "source";
    await db.insert(sources).values({
      orgId,
      name: body.name,
      slug: `${slugBase}-${Date.now().toString(36)}`,
      url: body.url,
      adapter: "generic-link",
      type: "link",
      enabled: false,
      reviewStatus: "candidate",
      createdById: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
