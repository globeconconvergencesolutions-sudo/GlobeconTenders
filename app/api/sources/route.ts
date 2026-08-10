import { NextResponse } from "next/server";
import { z } from "zod";

import { canCreateSources, canUploadDocuments } from "@/lib/auth/permissions";
import { requireSessionUser } from "@/lib/auth/session";
import {
  CLOUDINARY_FOLDERS,
  isCloudinaryConfigured,
  uploadSourceDocument,
} from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { slugify } from "@/lib/matching";
import { handleApiError } from "@/lib/api/errors";
import { assertCanAddSource } from "@/lib/platform/limits";
import { syncSource } from "@/lib/sync/engine";

const createSourceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("link"),
    name: z.string().min(2).max(120),
    url: z.string().url(),
    adapter: z
      .enum([
        "world-bank",
        "tender-yetu",
        "kenya-ppip",
        "afdb-procurement",
        "generic-rss",
        "generic-link",
      ])
      .default("generic-link"),
    color: z.string().optional(),
  }),
  z.object({
    type: z.literal("document"),
    name: z.string().min(2).max(120),
    color: z.string().optional(),
  }),
]);

export async function POST(request: Request) {
  try {
    const user = await requireSessionUser();
    if (!canCreateSources(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const db = getDb();
    if (!db) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    await assertCanAddSource(user.orgId);

    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      if (!canUploadDocuments(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!isCloudinaryConfigured()) {
        return NextResponse.json(
          { error: "Cloudinary is not configured yet" },
          { status: 503 },
        );
      }

      const formData = await request.formData();
      const name = String(formData.get("name") ?? "").trim();
      const file = formData.get("file");

      if (!name || !(file instanceof File)) {
        return NextResponse.json({ error: "Invalid document payload" }, { status: 400 });
      }

      const slug = slugify(name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const uploaded = await uploadSourceDocument(buffer, file.name, slug);

      const [created] = await db
        .insert(sources)
        .values({
          orgId: user.orgId,
          name,
          slug,
          type: "document",
          adapter: "document",
          cloudinaryPublicId: uploaded.publicId,
          cloudinaryUrl: uploaded.secureUrl,
          cloudinaryFolder: uploaded.folder,
          color: "#6366f1",
          createdById: user.id,
        })
        .returning();

      let parseResult = null;
      try {
        parseResult = await syncSource(created.id);
      } catch (error) {
        parseResult = {
          sourceId: created.id,
          sourceName: created.name,
          inserted: 0,
          updated: 0,
          errors: [
            error instanceof Error
              ? error.message
              : "Document uploaded but parsing failed",
          ],
        };
      }

      return NextResponse.json(
        { source: created, parseResult },
        { status: 201 },
      );
    }

    const payload = createSourceSchema.parse(await request.json());
    const slug = slugify(payload.name);

    const [created] = await db
      .insert(sources)
      .values({
        orgId: user.orgId,
        name: payload.name,
        slug,
        type: payload.type,
        adapter: payload.type === "link" ? payload.adapter : "document",
        url: payload.type === "link" ? payload.url : null,
        color: payload.color ?? "#2563eb",
        createdById: user.id,
      })
      .returning();

    return NextResponse.json({ source: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error, "Failed to create source");
  }
}

export async function GET() {
  try {
    const user = await requireSessionUser();
    const db = getDb();
    if (!db) return NextResponse.json({ sources: [] });
    const rows = await db
      .select()
      .from(sources)
      .where(eq(sources.orgId, user.orgId));
    return NextResponse.json({
      sources: rows,
      cloudinary: {
        rootFolder: CLOUDINARY_FOLDERS.root,
        sourceDocuments: CLOUDINARY_FOLDERS.sourceDocuments,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
