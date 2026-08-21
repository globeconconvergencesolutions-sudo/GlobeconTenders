import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@/lib/db";
import {
  countries,
  regions,
  serviceLines,
  sources,
  syncLogs,
  tenderServiceLineMatches,
  tenders,
} from "@/lib/db/schema";
import { detectRegionAndCountry, matchServiceLines } from "@/lib/matching";
import { orgAllowsSync } from "@/lib/platform/org-status";
import { DEFAULT_ORG_SLUG, getPlatformAppUrl } from "@/lib/tenant/config";
import { getOrganizationBySlug } from "@/lib/tenant/org";
import { isValidOrgSlug } from "@/lib/tenant/resolution";

const ingestItemSchema = z.object({
  referenceId: z.string().min(1).max(180).optional(),
  title: z.string().min(1).max(500),
  company: z.string().max(300).optional(),
  description: z.string().max(8000).optional(),
  category: z.string().max(200).optional(),
  deadline: z.string().nullable().optional(),
  url: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined))
    .pipe(z.string().url().optional()),
  status: z.string().max(80).optional(),
  portal: z.string().max(120).optional(),
  countryLabel: z.string().max(120).optional(),
  regionLabel: z.string().max(120).optional(),
});

export const ingestPayloadSchema = z.object({
  orgSlug: z.string().min(1).max(80).optional(),
  source: z
    .object({
      slug: z.string().min(1).max(80).optional(),
      name: z.string().min(1).max(160).optional(),
    })
    .optional(),
  items: z.array(ingestItemSchema).min(1).max(500),
});

export type IngestPayload = z.infer<typeof ingestPayloadSchema>;
export type IngestItem = z.infer<typeof ingestItemSchema>;

/** Dynamic ingest URL — follows APP_URL so staging/prod hosts can change freely. */
export function getIngestOpportunitiesUrl(): string {
  return `${getPlatformAppUrl()}/api/ingest/opportunities`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

/**
 * Parse titles like:
 * "Recruitment Specialist at Oasis Outsourcing | Fuzu"
 */
function parsePageTitle(pageTitle: string): {
  title?: string;
  company?: string;
  portal?: string;
} {
  const portalSplit = pageTitle.split("|");
  const portal = portalSplit.length > 1 ? portalSplit.pop()?.trim() : undefined;
  const main = portalSplit.join("|").trim();
  const atMatch = main.match(/^(.*?)\s+at\s+(.+)$/i);
  if (atMatch) {
    return {
      title: atMatch[1]?.trim() || undefined,
      company: atMatch[2]?.trim() || undefined,
      portal,
    };
  }
  return { title: main || undefined, portal };
}

function mapN8nJob(raw: unknown): IngestItem | null {
  const job = asRecord(raw);
  if (!job) return null;

  const pageTitle = asString(job.page_title);
  const parsed = pageTitle ? parsePageTitle(pageTitle) : {};
  const title =
    asString(job.job_title) ||
    parsed.title ||
    pageTitle;
  if (!title) return null;

  const url =
    asString(job.application_url) ||
    asString(job.job_url) ||
    asString(job.url);

  const deadlineRaw = job.deadline;
  const deadline =
    deadlineRaw === null || deadlineRaw === undefined
      ? null
      : asString(deadlineRaw) ?? String(deadlineRaw);

  return {
    title,
    company: asString(job.company) || parsed.company,
    description: asString(job.description),
    category: asString(job.job_type) || asString(job.category) || "Human Resources",
    deadline,
    url,
    status:
      asString(job.deadline_status) ||
      asString(job.status) ||
      "NO DEADLINE",
    portal: asString(job.source) || parsed.portal,
    countryLabel: asString(job.countryLabel) || asString(job.country) || "Kenya",
    regionLabel: asString(job.regionLabel) || asString(job.region),
    referenceId: asString(job.referenceId) || asString(job.reference_id),
  };
}

function collectJobs(raw: unknown): unknown[] {
  if (Array.isArray(raw)) {
    // n8n often sends: [{ total_jobs, jobs: [...] }]
    if (
      raw.length === 1 &&
      asRecord(raw[0]) &&
      Array.isArray(asRecord(raw[0])?.jobs)
    ) {
      return asRecord(raw[0])!.jobs as unknown[];
    }
    // Or a flat list of job objects
    if (raw.some((row) => asRecord(row)?.jobs)) {
      return raw.flatMap((row) => {
        const jobs = asRecord(row)?.jobs;
        return Array.isArray(jobs) ? jobs : [row];
      });
    }
    return raw;
  }

  const obj = asRecord(raw);
  if (!obj) return [];
  if (Array.isArray(obj.jobs)) return obj.jobs;
  if (Array.isArray(obj.items)) return obj.items;
  return [];
}

/**
 * Accept either:
 * 1) Canonical { orgSlug, source, items: [...] }
 * 2) n8n digest [{ total_jobs, jobs: [...] }] / { jobs: [...] }
 */
export function normalizeIngestBody(
  raw: unknown,
  options?: { orgSlug?: string | null },
): IngestPayload {
  const root = Array.isArray(raw) ? asRecord(raw[0]) : asRecord(raw);
  const explicitItems = root && Array.isArray(root.items) ? root.items : null;

  const items = (explicitItems ?? collectJobs(raw))
    .map(mapN8nJob)
    .filter((item): item is IngestItem => Boolean(item));

  if (items.length === 0) {
    throw new z.ZodError([
      {
        code: "custom",
        message: "No jobs/items found in payload",
        path: ["jobs"],
      },
    ]);
  }

  const orgSlug =
    options?.orgSlug ||
    asString(root?.orgSlug) ||
    asString(root?.org_slug) ||
    DEFAULT_ORG_SLUG;

  const vertical =
    asString(root?.vertical) ||
    (items.some((item) =>
      `${item.category ?? ""} ${item.portal ?? ""}`.toLowerCase().includes("hr"),
    )
      ? "hr"
      : undefined);

  return ingestPayloadSchema.parse({
    orgSlug,
    source: {
      slug:
        asString(asRecord(root?.source)?.slug) ||
        (vertical === "hr" ? "n8n-hr-jobs" : "n8n-feed"),
      name:
        asString(asRecord(root?.source)?.name) ||
        (vertical === "hr" ? "N8N HR Job Feed" : "N8N Opportunity Feed"),
    },
    items,
  });
}

function referenceFromItem(item: IngestItem): string {
  if (item.referenceId?.trim()) {
    return item.referenceId.trim().slice(0, 180);
  }
  if (item.url?.trim()) {
    try {
      const pathname = new URL(item.url).pathname.replace(/^\/+|\/+$/g, "");
      const fromUrl = pathname.split("/").filter(Boolean).pop();
      if (fromUrl) return `n8n-${slugify(fromUrl)}`.slice(0, 180);
    } catch {
      // fall through
    }
  }
  return `n8n-${slugify(`${item.portal ?? "job"}-${item.title}`)}`.slice(0, 180);
}

function parseDeadline(raw: string | null | undefined): Date {
  if (!raw || !raw.trim()) {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
  const normalized = raw.trim().toUpperCase();
  if (
    normalized === "N/A" ||
    normalized === "NO DEADLINE" ||
    normalized === "NONE" ||
    normalized === "OPEN"
  ) {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  }
  return parsed;
}

function isClosedFromStatus(
  status: string | undefined,
  deadline: Date,
): boolean {
  const s = (status ?? "").trim().toUpperCase();
  if (s.includes("CLOSED") || s.includes("EXPIRED")) return true;
  if (s.includes("OPEN") || s.includes("NO DEADLINE")) return false;
  return deadline.getTime() < Date.now();
}

export type IngestResult = {
  ok: true;
  orgId: number;
  orgSlug: string;
  sourceId: number;
  sourceSlug: string;
  received: number;
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
  ingestUrl: string;
};

export async function ingestOpportunities(
  payload: IngestPayload,
): Promise<IngestResult> {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const orgSlugRaw = (payload.orgSlug ?? DEFAULT_ORG_SLUG).trim().toLowerCase();
  if (!isValidOrgSlug(orgSlugRaw)) throw new Error("INVALID_SLUG");

  const org = await getOrganizationBySlug(orgSlugRaw);
  if (!org) throw new Error("ORG_NOT_FOUND");
  if (!orgAllowsSync(org.status)) throw new Error("ORG_SUSPENDED");

  const sourceSlug = slugify(payload.source?.slug ?? "n8n-hr-jobs") || "n8n-hr-jobs";
  const sourceName = payload.source?.name?.trim() || "N8N HR Job Feed";

  const [existingSource] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.orgId, org.id), eq(sources.slug, sourceSlug)))
    .limit(1);

  let sourceId: number;
  if (existingSource) {
    if (existingSource.archivedAt) {
      await db
        .update(sources)
        .set({
          archivedAt: null,
          enabled: true,
          name: sourceName,
          lastSyncedAt: new Date(),
          lastSyncStatus: "success",
          lastSyncError: null,
        })
        .where(eq(sources.id, existingSource.id));
    } else {
      await db
        .update(sources)
        .set({
          enabled: true,
          name: sourceName,
          lastSyncedAt: new Date(),
          lastSyncStatus: "success",
          lastSyncError: null,
        })
        .where(eq(sources.id, existingSource.id));
    }
    sourceId = existingSource.id;
  } else {
    const [created] = await db
      .insert(sources)
      .values({
        orgId: org.id,
        name: sourceName,
        slug: sourceSlug,
        type: "link",
        adapter: "generic-link",
        url: null,
        color: "#0f766e",
        enabled: true,
        isBuiltIn: false,
        lastSyncedAt: new Date(),
        lastSyncStatus: "success",
      })
      .returning({ id: sources.id });
    sourceId = created.id;
  }

  const [allRegions, allCountries, allServiceLines] = await Promise.all([
    db.select().from(regions).where(eq(regions.orgId, org.id)),
    db
      .select({
        id: countries.id,
        orgId: countries.orgId,
        regionId: countries.regionId,
        name: countries.name,
        slug: countries.slug,
        keywords: countries.keywords,
        isBuiltIn: countries.isBuiltIn,
        createdById: countries.createdById,
        createdAt: countries.createdAt,
        regionSlug: regions.slug,
      })
      .from(countries)
      .innerJoin(regions, eq(countries.regionId, regions.id))
      .where(eq(countries.orgId, org.id)),
    db
      .select()
      .from(serviceLines)
      .where(
        and(eq(serviceLines.orgId, org.id), isNull(serviceLines.archivedAt)),
      ),
  ]);

  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const item of payload.items) {
    try {
      const title = item.title.trim();
      if (!title) {
        skipped += 1;
        continue;
      }

      const referenceId = referenceFromItem(item);
      const deadline = parseDeadline(item.deadline);
      const company = item.company?.trim();
      const portal = item.portal?.trim();
      const description =
        item.description?.trim() ||
        [company ? `Company: ${company}` : null, portal ? `Portal: ${portal}` : null]
          .filter(Boolean)
          .join("\n") ||
        undefined;
      const category =
        item.category?.trim() ||
        portal ||
        "Human Resources";
      const projectLabel = company || portal || "External opportunity";
      const url = item.url?.trim() || undefined;

      const haystack = `${title} ${description ?? ""} ${item.countryLabel ?? ""} ${item.regionLabel ?? ""}`;
      const geo = detectRegionAndCountry(haystack, allRegions, allCountries);
      const matches = matchServiceLines(
        `${title} ${description ?? ""} ${category}`,
        allServiceLines,
      );
      const topScore = matches[0]?.score ?? 0;

      const regionLabel = item.regionLabel?.trim() || geo.regionLabel;
      const countryLabel = item.countryLabel?.trim() || geo.countryLabel;

      const [existing] = await db
        .select({ id: tenders.id })
        .from(tenders)
        .where(
          and(
            eq(tenders.sourceId, sourceId),
            eq(tenders.referenceId, referenceId),
          ),
        )
        .limit(1);

      let tenderId: number;
      if (existing) {
        await db
          .update(tenders)
          .set({
            title,
            description,
            category,
            deadline,
            url,
            projectLabel,
            regionId: geo.regionId,
            countryId: geo.countryId,
            regionLabel,
            countryLabel,
            matchScore: topScore,
            isClosed: isClosedFromStatus(item.status, deadline),
            updatedAt: new Date(),
          })
          .where(eq(tenders.id, existing.id));
        tenderId = existing.id;
        updated += 1;
      } else {
        const [created] = await db
          .insert(tenders)
          .values({
            orgId: org.id,
            sourceId,
            referenceId,
            title,
            description,
            category,
            deadline,
            url,
            projectLabel,
            regionId: geo.regionId,
            countryId: geo.countryId,
            regionLabel,
            countryLabel,
            matchScore: topScore,
            isClosed: isClosedFromStatus(item.status, deadline),
          })
          .returning({ id: tenders.id });
        tenderId = created.id;
        inserted += 1;
      }

      await db
        .delete(tenderServiceLineMatches)
        .where(eq(tenderServiceLineMatches.tenderId, tenderId));

      if (matches.length > 0) {
        await db.insert(tenderServiceLineMatches).values(
          matches.map((m) => ({
            tenderId,
            serviceLineId: m.serviceLineId,
            score: m.score,
          })),
        );
      }
    } catch (error) {
      errors.push(
        `${item.title}: ${error instanceof Error ? error.message : "ingest failed"}`,
      );
    }
  }

  await db.insert(syncLogs).values({
    orgId: org.id,
    sourceId,
    triggeredBy: "n8n-ingest",
    status: errors.length ? "partial" : "success",
    tenderCount: inserted + updated,
    errorMessage: errors.length ? errors.slice(0, 5).join("; ") : null,
  });

  return {
    ok: true,
    orgId: org.id,
    orgSlug: org.slug,
    sourceId,
    sourceSlug,
    received: payload.items.length,
    inserted,
    updated,
    skipped,
    errors,
    ingestUrl: getIngestOpportunitiesUrl(),
  };
}

export function getIngestBearerSecret(): string | null {
  const dedicated = process.env.INGEST_SECRET?.trim();
  if (dedicated) return dedicated;
  const shared = process.env.SYNC_CRON_SECRET?.trim();
  return shared || null;
}
