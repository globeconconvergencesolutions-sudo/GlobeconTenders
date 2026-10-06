import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  companyCapabilities,
  companyProfiles,
  companyProjects,
  companyPersonnel,
  companyCertifications,
} from "@/lib/db/schema";
import { getOrgContext } from "@/lib/tenant/org-context";

const profileSchema = z.object({
  legalName: z.string().max(200).optional(),
  registrationNumber: z.string().max(80).optional(),
  country: z.string().max(80).optional(),
  locations: z.string().max(300).optional(),
  yearsOperating: z.number().int().min(0).max(200).nullable().optional(),
  description: z.string().max(4000).optional(),
  website: z.string().max(300).optional(),
  contacts: z.string().max(300).optional(),
});

async function guard() {
  const user = await requireSessionUser();
  if (!user.orgId) throw new Error("UNAUTHORIZED");
  if (user.role === "viewer") throw new Error("FORBIDDEN");
  const org = await getOrgContext();
  if (!org.features.pis) throw new Error("FEATURE_DISABLED");
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  return { user, db, orgId: user.orgId };
}

export async function PUT(request: Request) {
  try {
    const { db, orgId } = await guard();
    const body = profileSchema.parse(await request.json());
    const values = {
      legalName: body.legalName ?? null,
      registrationNumber: body.registrationNumber ?? null,
      country: body.country ?? null,
      locations: body.locations ?? null,
      yearsOperating: body.yearsOperating ?? null,
      description: body.description ?? null,
      website: body.website ?? null,
      contacts: body.contacts ?? null,
      updatedAt: new Date(),
    };
    const [existing] = await db
      .select({ id: companyProfiles.id })
      .from(companyProfiles)
      .where(eq(companyProfiles.orgId, orgId))
      .limit(1);
    if (existing) {
      await db.update(companyProfiles).set(values).where(eq(companyProfiles.id, existing.id));
    } else {
      await db.insert(companyProfiles).values({ orgId, ...values });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}

const capabilitySchema = z.object({
  name: z.string().min(2).max(160),
  description: z.string().max(1000).optional(),
  catalogServiceLineId: z.number().int().positive().nullable().optional(),
});

export async function POST(request: Request) {
  try {
    const { db, orgId } = await guard();
    const payload = await request.json();
    const kind = payload.kind as string;
    if (kind === "capability") {
      const body = capabilitySchema.parse(payload);
      await db.insert(companyCapabilities).values({
        orgId,
        name: body.name,
        description: body.description,
        catalogServiceLineId: body.catalogServiceLineId ?? null,
        verificationStatus: "self_declared",
      });
    } else if (kind === "project") {
      const body = z
        .object({
          name: z.string().min(2).max(200),
          client: z.string().max(160).optional(),
          country: z.string().max(80).optional(),
          scope: z.string().max(2000).optional(),
          role: z.string().max(160).optional(),
          value: z.string().max(80).optional(),
          currency: z.string().max(12).optional(),
          startDate: z.string().max(20).optional(),
          endDate: z.string().max(20).optional(),
        })
        .parse(payload);
      await db.insert(companyProjects).values({
        orgId,
        ...body,
        verificationStatus: "self_declared",
      });
    } else if (kind === "personnel") {
      const body = z
        .object({
          name: z.string().min(2).max(160),
          position: z.string().max(160).optional(),
          discipline: z.string().max(160).optional(),
          yearsExperience: z.number().int().min(0).max(80).nullable().optional(),
          certifications: z.string().max(300).optional(),
        })
        .parse(payload);
      await db.insert(companyPersonnel).values({
        orgId,
        name: body.name,
        position: body.position,
        discipline: body.discipline,
        yearsExperience: body.yearsExperience ?? null,
        certifications: body.certifications,
        verificationStatus: "self_declared",
      });
    } else if (kind === "certification") {
      const body = z
        .object({
          name: z.string().min(2).max(160),
          issuer: z.string().max(160).optional(),
          expiresOn: z.string().max(20).optional(),
        })
        .parse(payload);
      await db.insert(companyCertifications).values({
        orgId,
        name: body.name,
        issuer: body.issuer,
        expiresOn: body.expiresOn,
        verificationStatus: "unverified",
      });
    } else if (kind === "verify") {
      const body = z
        .object({
          record: z.enum(["capability", "project", "personnel", "certification"]),
          id: z.number().int().positive(),
          verificationStatus: z.enum(["self_declared", "unverified", "verified"]),
        })
        .parse(payload);
      const table =
        body.record === "capability"
          ? companyCapabilities
          : body.record === "project"
            ? companyProjects
            : body.record === "personnel"
              ? companyPersonnel
              : companyCertifications;
      await db
        .update(table)
        .set({ verificationStatus: body.verificationStatus })
        .where(and(eq(table.id, body.id), eq(table.orgId, orgId)));
    } else {
      throw new Error("NOT_FOUND");
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
