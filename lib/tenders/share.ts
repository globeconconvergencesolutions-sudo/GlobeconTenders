import { createHash, randomBytes } from "node:crypto";

import { and, eq, gt, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  countries,
  regions,
  serviceLines,
  sources,
  tenderServiceLineMatches,
  tenderShares,
  tenders,
  type TenderWithSource,
} from "@/lib/db/schema";

export const SHARE_LINK_EXPIRY_DAYS = 90;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateShareToken(): string {
  return randomBytes(24).toString("hex");
}

export async function getOrCreateTenderShareLink(input: {
  tenderId: number;
  createdById: number;
  appUrl: string;
}): Promise<{ shareUrl: string; expiresAt: Date; created: boolean }> {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const now = new Date();

  const [existing] = await db
    .select({
      tokenHash: tenderShares.tokenHash,
      expiresAt: tenderShares.expiresAt,
    })
    .from(tenderShares)
    .where(
      and(
        eq(tenderShares.tenderId, input.tenderId),
        gt(tenderShares.expiresAt, now),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      shareUrl: `${input.appUrl}/share/${existing.tokenHash}`,
      expiresAt: existing.expiresAt,
      created: false,
    };
  }

  const rawToken = generateShareToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(
    Date.now() + SHARE_LINK_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  );

  const [tender] = await db
    .select({ orgId: tenders.orgId })
    .from(tenders)
    .where(eq(tenders.id, input.tenderId))
    .limit(1);

  if (!tender) throw new Error("Tender not found");

  await db.insert(tenderShares).values({
    orgId: tender.orgId,
    tenderId: input.tenderId,
    tokenHash,
    createdById: input.createdById,
    expiresAt,
  });

  return {
    shareUrl: `${input.appUrl}/share/${tokenHash}`,
    expiresAt,
    created: true,
  };
}

export type PublicTenderView = TenderWithSource & {
  matchedServiceLines: string[];
};

export async function getPublicTenderByShareToken(
  token: string,
): Promise<PublicTenderView | null> {
  const db = getDb();
  if (!db) return null;

  const tokenHash = token.trim();
  if (!/^[a-f0-9]{64}$/i.test(tokenHash)) return null;
  const now = new Date();

  const [share] = await db
    .select({
      id: tenderShares.id,
      tenderId: tenderShares.tenderId,
      expiresAt: tenderShares.expiresAt,
    })
    .from(tenderShares)
    .where(eq(tenderShares.tokenHash, tokenHash))
    .limit(1);

  if (!share || share.expiresAt < now) return null;

  await db
    .update(tenderShares)
    .set({ viewCount: sql`${tenderShares.viewCount} + 1` })
    .where(eq(tenderShares.id, share.id));

  const [row] = await db
    .select({
      id: tenders.id,
      orgId: tenders.orgId,
      sourceId: tenders.sourceId,
      referenceId: tenders.referenceId,
      title: tenders.title,
      description: tenders.description,
      projectLabel: tenders.projectLabel,
      category: tenders.category,
      deadline: tenders.deadline,
      url: tenders.url,
      regionId: tenders.regionId,
      countryId: tenders.countryId,
      regionLabel: tenders.regionLabel,
      countryLabel: tenders.countryLabel,
      isClosed: tenders.isClosed,
      saved: tenders.saved,
      matchScore: tenders.matchScore,
      customFields: tenders.customFields,
      createdAt: tenders.createdAt,
      updatedAt: tenders.updatedAt,
      sourceName: sources.name,
      sourceColor: sources.color,
      sourceSlug: sources.slug,
      regionName: regions.name,
      countryName: countries.name,
    })
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .leftJoin(regions, eq(tenders.regionId, regions.id))
    .leftJoin(countries, eq(tenders.countryId, countries.id))
    .where(eq(tenders.id, share.tenderId))
    .limit(1);

  if (!row) return null;

  const serviceLineRows = await db
    .select({ name: serviceLines.name })
    .from(tenderServiceLineMatches)
    .innerJoin(
      serviceLines,
      eq(tenderServiceLineMatches.serviceLineId, serviceLines.id),
    )
    .where(eq(tenderServiceLineMatches.tenderId, share.tenderId))
    .orderBy(serviceLines.name);

  return {
    ...row,
    matchedServiceLines: serviceLineRows.map((line) => line.name),
  };
}
