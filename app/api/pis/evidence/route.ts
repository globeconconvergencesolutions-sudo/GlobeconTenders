import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { deleteCloudinaryAsset, isCloudinaryConfigured, uploadEvidenceDocument } from "@/lib/cloudinary";
import { evidenceDocuments } from "@/lib/db/schema";
import { requirePisEditor } from "@/lib/pis/guard";
import { getOrgContext } from "@/lib/tenant/org-context";

const jsonSchema = z.object({
  name: z.string().min(2).max(200),
  documentType: z.string().min(2).max(80),
  url: z.string().url().optional().or(z.literal("")),
  relatedLabel: z.string().max(200).optional(),
  issuedOn: z.string().max(20).optional(),
  expiresOn: z.string().max(20).optional(),
  confidentiality: z.enum(["internal", "restricted", "finance"]).default("internal"),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  try {
    const { db, orgId, user } = await requirePisEditor();
    const contentType = request.headers.get("content-type") ?? "";
    let values = {
      name: "",
      documentType: "",
      url: null as string | null,
      relatedLabel: null as string | null,
      issuedOn: null as string | null,
      expiresOn: null as string | null,
      confidentiality: "internal",
      notes: null as string | null,
      cloudinaryPublicId: null as string | null,
    };

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const parsed = jsonSchema.parse({
        name: String(form.get("name") ?? ""),
        documentType: String(form.get("documentType") ?? ""),
        url: String(form.get("url") ?? ""),
        relatedLabel: String(form.get("relatedLabel") ?? ""),
        issuedOn: String(form.get("issuedOn") ?? ""),
        expiresOn: String(form.get("expiresOn") ?? ""),
        confidentiality: String(form.get("confidentiality") ?? "internal"),
        notes: String(form.get("notes") ?? ""),
      });
      values = {
        name: parsed.name,
        documentType: parsed.documentType,
        url: parsed.url || null,
        relatedLabel: parsed.relatedLabel || null,
        issuedOn: parsed.issuedOn || null,
        expiresOn: parsed.expiresOn || null,
        confidentiality: parsed.confidentiality,
        notes: parsed.notes || null,
        cloudinaryPublicId: null,
      };
      const file = form.get("file");
      if (file instanceof File && file.size > 0) {
        if (!isCloudinaryConfigured()) throw new Error("Cloudinary is not configured");
        if (file.size > 10_000_000) throw new Error("File is larger than 10 MB");
        const org = await getOrgContext();
        const uploaded = await uploadEvidenceDocument(
          Buffer.from(await file.arrayBuffer()),
          file.name,
          org.orgSlug || `org-${orgId}`,
        );
        values.url = uploaded.secureUrl;
        values.cloudinaryPublicId = uploaded.publicId;
      }
    } else {
      const parsed = jsonSchema.parse(await request.json());
      values = {
        name: parsed.name,
        documentType: parsed.documentType,
        url: parsed.url || null,
        relatedLabel: parsed.relatedLabel || null,
        issuedOn: parsed.issuedOn || null,
        expiresOn: parsed.expiresOn || null,
        confidentiality: parsed.confidentiality,
        notes: parsed.notes || null,
        cloudinaryPublicId: null,
      };
    }

    await db.insert(evidenceDocuments).values({
      orgId,
      name: values.name,
      documentType: values.documentType,
      url: values.url,
      relatedLabel: values.relatedLabel,
      issuedOn: values.issuedOn,
      expiresOn: values.expiresOn,
      confidentiality: values.confidentiality,
      notes: values.notes,
      cloudinaryPublicId: values.cloudinaryPublicId,
      verificationStatus: "unverified",
      uploadedById: user.id,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { db, orgId } = await requirePisEditor();
    const body = z.object({ id: z.number().int().positive() }).parse(await request.json());
    const [row] = await db
      .select()
      .from(evidenceDocuments)
      .where(and(eq(evidenceDocuments.id, body.id), eq(evidenceDocuments.orgId, orgId)))
      .limit(1);
    if (!row) throw new Error("NOT_FOUND");
    await deleteCloudinaryAsset(row.cloudinaryPublicId);
    await db.delete(evidenceDocuments).where(eq(evidenceDocuments.id, row.id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
