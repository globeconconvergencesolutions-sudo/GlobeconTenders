import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  DEFAULT_WORKSPACE_RELEVANCE,
  organizations,
  serviceLines,
  tenders,
  workspaceSettings,
} from "@/lib/db/schema";
import { scoreOpportunity } from "@/lib/matching";
import { mergeMatchScores, scoreCatalogText } from "@/lib/pis/catalog-match";
import { matchHaystack } from "@/lib/pis/translate";
import { daysUntil } from "@/lib/utils";

export const LISTING_STATES = [
  "live",
  "rolling",
  "stale",
  "expired",
  "closed",
  "review",
  "irrelevant",
] as const;

export type ListingState = (typeof LISTING_STATES)[number];

export type RelevanceOverride = "include" | "exclude" | null;

/** Pipeline buckets shown in the UI. */
export type ListingBucket =
  | "live"
  | "review"
  | "filtered"
  | "stale"
  | "archive"
  | "all";

export const LISTING_BUCKETS: ListingBucket[] = [
  "live",
  "review",
  "filtered",
  "stale",
  "archive",
  "all",
];

export function isListingBucket(
  value: string | null | undefined,
): value is ListingBucket {
  return (
    value === "live" ||
    value === "review" ||
    value === "filtered" ||
    value === "stale" ||
    value === "archive" ||
    value === "all"
  );
}

/** Missing/unparsed deadlines are stored ~1 year out. */
export const ROLLING_DEADLINE_DAYS = 300;

const TERMINAL_STATUS =
  /\b(CLOSED|EXPIRED|CANCEL+ED|AWARDED|WITHDRAWN|COMPLETED|ARCHIVED)\b/i;
const OPEN_STATUS =
  /\b(OPEN|ACTIVE|LIVE|PUBLISHED|AVAILABLE|CURRENT|NO[\s_-]?DEADLINE)\b/i;
const ROLLING_STATUS =
  /\b(N\/?A|NONE|NO[\s_-]?DEADLINE|OPEN[\s_-]?ENDED|ROLLING)\b/i;

export type ListingResolution = {
  listingState: ListingState;
  isClosed: boolean;
  hasHardDeadline: boolean;
  sourceStatus: string | null;
  relevanceReason?: string | null;
};

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function deadlinePassed(deadline: Date, now = new Date()): boolean {
  return startOfUtcDay(deadline).getTime() < startOfUtcDay(now).getTime();
}

export function normalizeSourceStatus(
  status: string | null | undefined,
): string | null {
  const trimmed = status?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 80);
}

export function isTerminalSourceStatus(status: string | null | undefined): boolean {
  return Boolean(status && TERMINAL_STATUS.test(status));
}

export function isOpenLikeSourceStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  if (isTerminalSourceStatus(status)) return false;
  return OPEN_STATUS.test(status) || ROLLING_STATUS.test(status);
}

export function isRollingSourceStatus(status: string | null | undefined): boolean {
  return Boolean(status && ROLLING_STATUS.test(status));
}

/**
 * Canonical listing fields from deadline + portal status.
 *
 * - live: actionable, hard deadline today or later
 * - rolling: no hard deadline (still shown in Live)
 * - stale: deadline past but portal still claims open
 * - expired: deadline past, portal not claiming open
 * - closed: portal terminal (awarded / cancelled / closed)
 * - irrelevant: below org match threshold (hidden from pipeline tabs)
 */
export function resolveListingFields(input: {
  deadline: Date;
  sourceStatus?: string | null;
  hasHardDeadline?: boolean;
  now?: Date;
}): ListingResolution {
  const sourceStatus = normalizeSourceStatus(input.sourceStatus);
  const now = input.now ?? new Date();
  const hard =
    typeof input.hasHardDeadline === "boolean"
      ? input.hasHardDeadline
      : !isRollingSourceStatus(sourceStatus) &&
        daysUntil(input.deadline) <= ROLLING_DEADLINE_DAYS;

  if (isTerminalSourceStatus(sourceStatus)) {
    return {
      listingState: "closed",
      isClosed: true,
      hasHardDeadline: hard,
      sourceStatus,
    };
  }

  if (!hard) {
    return {
      listingState: "rolling",
      isClosed: false,
      hasHardDeadline: false,
      sourceStatus: sourceStatus ?? "NO DEADLINE",
    };
  }

  if (!deadlinePassed(input.deadline, now)) {
    return {
      listingState: "live",
      isClosed: false,
      hasHardDeadline: true,
      sourceStatus,
    };
  }

  // Past calendar deadline
  if (isOpenLikeSourceStatus(sourceStatus)) {
    return {
      listingState: "stale",
      isClosed: false,
      hasHardDeadline: true,
      sourceStatus,
    };
  }

  return {
    listingState: "expired",
    isClosed: true,
    hasHardDeadline: true,
    sourceStatus,
  };
}

/**
 * Apply org relevance gate after deadline/status resolution.
 *
 * - override include → keep calendar listing (Live path)
 * - override exclude → filtered out
 * - refined score ≥ threshold → Live path
 * - raw score > 0 but not passing → Needs review
 * - raw score 0 → Filtered out
 */
export function applyRelevanceGate(
  listing: ListingResolution,
  refinedScore: number,
  minMatchScore: number,
  options?: {
    rawScore?: number;
    reason?: string | null;
    override?: RelevanceOverride;
  },
): ListingResolution {
  const rawScore = options?.rawScore ?? refinedScore;
  const override = options?.override ?? null;

  if (override === "include") {
    return {
      ...listing,
      relevanceReason: "Manually allowed on Live",
    };
  }
  if (override === "exclude") {
    return {
      ...listing,
      listingState: "irrelevant",
      isClosed: true,
      relevanceReason: "Manually kept out of Live",
    };
  }
  if (refinedScore >= minMatchScore) {
    return {
      ...listing,
      relevanceReason: null,
    };
  }
  if (rawScore > 0) {
    return {
      ...listing,
      listingState: "review",
      isClosed: false,
      relevanceReason:
        options?.reason ??
        `Score ${rawScore} is below the Live threshold (${minMatchScore})`,
    };
  }
  return {
    ...listing,
    listingState: "irrelevant",
    isClosed: true,
    relevanceReason: options?.reason ?? "No service-line keyword match",
  };
}

/** Hidden from the default Live/Stale/Archive operator tabs. */
export const pipelineVisibleSql = sql`(
  ${tenders.listingState} is distinct from 'irrelevant'
  and ${tenders.listingState} is distinct from 'review'
)`;

/** Default pipeline: live + rolling (actionable). */
export const liveListingSql = sql`(
  ${tenders.listingState} in ('live', 'rolling')
  or (
    ${tenders.listingState} is null
    and ${tenders.isClosed} = false
    and ${tenders.deadline}::date >= CURRENT_DATE
  )
)`;

export const reviewListingSql = sql`${tenders.listingState} = 'review'`;

export const filteredListingSql = sql`${tenders.listingState} = 'irrelevant'`;

export const staleListingSql = sql`${tenders.listingState} = 'stale'`;

export const archiveListingSql = sql`(
  ${tenders.listingState} in ('expired', 'closed')
  or (
    ${tenders.listingState} is null
    and (
      ${tenders.isClosed} = true
      or ${tenders.deadline}::date < CURRENT_DATE
    )
  )
)`;

/** @deprecated Prefer liveListingSql — kept for transitional callers. */
export const deadlineNotPassedSql = sql`${tenders.deadline}::date >= CURRENT_DATE`;

export function listingBucketSql(bucket: ListingBucket) {
  switch (bucket) {
    case "review":
      return reviewListingSql;
    case "filtered":
      return filteredListingSql;
    case "stale":
      return staleListingSql;
    case "archive":
      return archiveListingSql;
    case "all":
      return sql`true`;
    case "live":
    default:
      return liveListingSql;
  }
}

export type OpportunityTiming = {
  daysLeft: number;
  label: string;
  tone: "expired" | "urgent" | "soon" | "ok" | "rolling" | "stale" | "closed";
};

export function opportunityTiming(
  deadline: Date | string,
  options?: {
    listingState?: ListingState | null;
    sourceStatus?: string | null;
    hasHardDeadline?: boolean | null;
  },
): OpportunityTiming {
  const daysLeft = daysUntil(deadline);
  const state = options?.listingState;

  if (state === "irrelevant" || state === "closed") {
    return { daysLeft, label: "Closed by source", tone: "closed" };
  }
  if (state === "review") {
    return { daysLeft, label: "Needs review", tone: "soon" };
  }
  if (state === "stale") {
    return {
      daysLeft,
      label: `Stale · ${Math.abs(daysLeft)}d past deadline`,
      tone: "stale",
    };
  }
  if (state === "expired" || daysLeft < 0) {
    return {
      daysLeft,
      label: `Expired · ${Math.abs(daysLeft)}d ago`,
      tone: "expired",
    };
  }
  if (
    state === "rolling" ||
    options?.hasHardDeadline === false ||
    daysLeft > ROLLING_DEADLINE_DAYS
  ) {
    return { daysLeft, label: "No hard deadline", tone: "rolling" };
  }
  if (daysLeft === 0) {
    return { daysLeft, label: "Closes today", tone: "urgent" };
  }
  if (daysLeft <= 3) {
    return { daysLeft, label: `${daysLeft}d left`, tone: "urgent" };
  }
  if (daysLeft <= 7) {
    return { daysLeft, label: `${daysLeft}d left`, tone: "soon" };
  }
  return { daysLeft, label: `${daysLeft}d left`, tone: "ok" };
}

/** Milliseconds until an exact deadline timestamp. */
export function msUntilDeadline(deadline: Date | string, now = Date.now()): number {
  const target =
    deadline instanceof Date ? deadline.getTime() : new Date(deadline).getTime();
  return target - now;
}

/** Format remaining time for under-24h countdown (e.g. "4h 12m left"). */
export function formatCountdownLabel(msLeft: number): string {
  if (msLeft <= 0) return "Closed";
  const totalSec = Math.floor(msLeft / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

export function timingTextClass(tone: OpportunityTiming["tone"]): string {
  switch (tone) {
    case "expired":
    case "closed":
      return "text-red-700 dark:text-red-400";
    case "stale":
      return "text-amber-700 dark:text-amber-300";
    case "urgent":
      return "text-red-600";
    case "soon":
      return "text-amber-600";
    case "rolling":
      return "text-slate-500";
    default:
      return "text-emerald-600";
  }
}

export function timingBarClass(tone: OpportunityTiming["tone"]): string {
  switch (tone) {
    case "expired":
    case "closed":
    case "urgent":
      return "bg-red-500";
    case "stale":
    case "soon":
      return "bg-amber-500";
    case "rolling":
      return "bg-slate-300 dark:bg-slate-600";
    default:
      return "bg-emerald-500";
  }
}

export function listingStateBadgeLabel(state: ListingState | null | undefined): string | null {
  switch (state) {
    case "stale":
      return "Stale listing";
    case "expired":
      return "Expired";
    case "closed":
      return "Closed";
    case "rolling":
      return "Open-ended";
    case "review":
      return "Needs review";
    case "irrelevant":
      return "Filtered out";
    default:
      return null;
  }
}

/**
 * Recompute listing_state / is_closed / has_hard_deadline for an org (or all).
 * Safe to run on every sync/cron — calendar drift is the main reason rows go stale.
 * Rows already marked irrelevant are left alone (relevance backfill / sync owns them).
 */
export async function reconcileTenderListings(orgId?: number): Promise<{
  updated: number;
}> {
  const db = getDb();
  if (!db) return { updated: 0 };

  const orgClause =
    orgId != null && orgId > 0
      ? sql`AND "org_id" = ${orgId}`
      : sql``;

  const result = await db.execute(sql`
    UPDATE "tenders"
    SET
      "has_hard_deadline" = CASE
        WHEN coalesce("source_status", '') ~* '(N\\/?A|NONE|NO[[:space:]_-]?DEADLINE|OPEN[[:space:]_-]?ENDED|ROLLING)'
          THEN false
        WHEN "deadline"::date > CURRENT_DATE + interval '300 days'
          THEN false
        ELSE true
      END,
      "listing_state" = CASE
        WHEN coalesce("source_status", '') ~* '(CLOSED|EXPIRED|CANCEL+ED|AWARDED|WITHDRAWN|COMPLETED|ARCHIVED)'
          THEN 'closed'
        WHEN coalesce("source_status", '') ~* '(N\\/?A|NONE|NO[[:space:]_-]?DEADLINE|OPEN[[:space:]_-]?ENDED|ROLLING)'
          OR "deadline"::date > CURRENT_DATE + interval '300 days'
          THEN 'rolling'
        WHEN "deadline"::date >= CURRENT_DATE
          THEN 'live'
        WHEN coalesce("source_status", '') ~* '(OPEN|ACTIVE|LIVE|PUBLISHED|AVAILABLE|CURRENT|NO[[:space:]_-]?DEADLINE)'
          AND coalesce("source_status", '') !~* '(CLOSED|EXPIRED|CANCEL+ED|AWARDED|WITHDRAWN|COMPLETED|ARCHIVED)'
          THEN 'stale'
        ELSE 'expired'
      END,
      "is_closed" = CASE
        WHEN coalesce("source_status", '') ~* '(CLOSED|EXPIRED|CANCEL+ED|AWARDED|WITHDRAWN|COMPLETED|ARCHIVED)'
          THEN true
        WHEN coalesce("source_status", '') ~* '(N\\/?A|NONE|NO[[:space:]_-]?DEADLINE|OPEN[[:space:]_-]?ENDED|ROLLING)'
          OR "deadline"::date > CURRENT_DATE + interval '300 days'
          THEN false
        WHEN "deadline"::date >= CURRENT_DATE
          THEN false
        WHEN coalesce("source_status", '') ~* '(OPEN|ACTIVE|LIVE|PUBLISHED|AVAILABLE|CURRENT|NO[[:space:]_-]?DEADLINE)'
          AND coalesce("source_status", '') !~* '(CLOSED|EXPIRED|CANCEL+ED|AWARDED|WITHDRAWN|COMPLETED|ARCHIVED)'
          THEN false
        ELSE true
      END
    WHERE true
    ${orgClause}
      AND "listing_state" IS DISTINCT FROM 'irrelevant'
      AND "listing_state" IS DISTINCT FROM 'review'
      AND coalesce("relevance_override", '') = ''
      AND (
        "listing_state" IS DISTINCT FROM (
          CASE
            WHEN coalesce("source_status", '') ~* '(CLOSED|EXPIRED|CANCEL+ED|AWARDED|WITHDRAWN|COMPLETED|ARCHIVED)'
              THEN 'closed'
            WHEN coalesce("source_status", '') ~* '(N\\/?A|NONE|NO[[:space:]_-]?DEADLINE|OPEN[[:space:]_-]?ENDED|ROLLING)'
              OR "deadline"::date > CURRENT_DATE + interval '300 days'
              THEN 'rolling'
            WHEN "deadline"::date >= CURRENT_DATE
              THEN 'live'
            WHEN coalesce("source_status", '') ~* '(OPEN|ACTIVE|LIVE|PUBLISHED|AVAILABLE|CURRENT|NO[[:space:]_-]?DEADLINE)'
              AND coalesce("source_status", '') !~* '(CLOSED|EXPIRED|CANCEL+ED|AWARDED|WITHDRAWN|COMPLETED|ARCHIVED)'
              THEN 'stale'
            ELSE 'expired'
          END
        )
        OR "is_closed" IS DISTINCT FROM (
          CASE
            WHEN coalesce("source_status", '') ~* '(CLOSED|EXPIRED|CANCEL+ED|AWARDED|WITHDRAWN|COMPLETED|ARCHIVED)'
              THEN true
            WHEN coalesce("source_status", '') ~* '(N\\/?A|NONE|NO[[:space:]_-]?DEADLINE|OPEN[[:space:]_-]?ENDED|ROLLING)'
              OR "deadline"::date > CURRENT_DATE + interval '300 days'
              THEN false
            WHEN "deadline"::date >= CURRENT_DATE
              THEN false
            WHEN coalesce("source_status", '') ~* '(OPEN|ACTIVE|LIVE|PUBLISHED|AVAILABLE|CURRENT|NO[[:space:]_-]?DEADLINE)'
              AND coalesce("source_status", '') !~* '(CLOSED|EXPIRED|CANCEL+ED|AWARDED|WITHDRAWN|COMPLETED|ARCHIVED)'
              THEN false
            ELSE true
          END
        )
        OR "has_hard_deadline" IS DISTINCT FROM (
          CASE
            WHEN coalesce("source_status", '') ~* '(N\\/?A|NONE|NO[[:space:]_-]?DEADLINE|OPEN[[:space:]_-]?ENDED|ROLLING)'
              THEN false
            WHEN "deadline"::date > CURRENT_DATE + interval '300 days'
              THEN false
            ELSE true
          END
        )
      )
  `);

  const rowCount =
    typeof result === "object" &&
    result !== null &&
    "rowCount" in result &&
    typeof (result as { rowCount?: number }).rowCount === "number"
      ? (result as { rowCount: number }).rowCount
      : 0;

  return { updated: rowCount };
}

/**
 * Re-score tenders against active service lines.
 * Respects relevanceOverride; near-misses → review; hard rejects → irrelevant.
 */
export async function reconcileTenderRelevance(orgId?: number): Promise<{
  marked: number;
  restored: number;
  orgs: number;
}> {
  const db = getDb();
  if (!db) return { marked: 0, restored: 0, orgs: 0 };

  const orgRows =
    orgId != null && orgId > 0
      ? await db
          .select({ id: organizations.id })
          .from(organizations)
          .where(eq(organizations.id, orgId))
      : await db.select({ id: organizations.id }).from(organizations);

  let marked = 0;
  let restored = 0;

  for (const org of orgRows) {
    const [settingsRow] = await db
      .select({ relevance: workspaceSettings.relevance })
      .from(workspaceSettings)
      .where(eq(workspaceSettings.orgId, org.id))
      .limit(1);

    const raw = Number(settingsRow?.relevance?.minMatchScore);
    const minMatchScore = Number.isFinite(raw)
      ? Math.min(100, Math.max(0, Math.round(raw)))
      : DEFAULT_WORKSPACE_RELEVANCE.minMatchScore;

    const activeLines = await db
      .select()
      .from(serviceLines)
      .where(
        and(eq(serviceLines.orgId, org.id), isNull(serviceLines.archivedAt)),
      );

    const rows = await db
      .select({
        id: tenders.id,
        title: tenders.title,
        description: tenders.description,
        titleEn: tenders.titleEn,
        descriptionEn: tenders.descriptionEn,
        category: tenders.category,
        deadline: tenders.deadline,
        sourceStatus: tenders.sourceStatus,
        hasHardDeadline: tenders.hasHardDeadline,
        listingState: tenders.listingState,
        matchScore: tenders.matchScore,
        relevanceOverride: tenders.relevanceOverride,
      })
      .from(tenders)
      .where(
        and(
          eq(tenders.orgId, org.id),
          inArray(tenders.listingState, [
            "live",
            "rolling",
            "stale",
            "expired",
            "closed",
            "review",
            "irrelevant",
          ]),
        ),
      );

    for (const row of rows) {
      const noticeText = matchHaystack(row);
      const scored = scoreOpportunity(noticeText, activeLines);
      const catalogHits = await scoreCatalogText(db, noticeText);
      const merged = mergeMatchScores(
        scored.topScore,
        scored.rawTopScore,
        catalogHits[0]?.score ?? 0,
      );
      const baseListing = resolveListingFields({
        deadline: row.deadline,
        sourceStatus: row.sourceStatus,
        hasHardDeadline: row.hasHardDeadline,
      });
      const listing = applyRelevanceGate(
        baseListing,
        merged.gateScore,
        minMatchScore,
        {
          rawScore: merged.matchScore,
          reason: scored.reason,
          override: (row.relevanceOverride as RelevanceOverride) ?? null,
        },
      );

      const unchanged =
        listing.listingState === row.listingState &&
        merged.matchScore === row.matchScore;

      if (unchanged && !listing.relevanceReason) {
        continue;
      }

      const wasPipeline =
        row.listingState === "live" ||
        row.listingState === "rolling" ||
        row.listingState === "stale";
      const nowHidden =
        listing.listingState === "review" ||
        listing.listingState === "irrelevant";
      const wasHidden =
        row.listingState === "review" || row.listingState === "irrelevant";
      const nowPipeline =
        listing.listingState === "live" ||
        listing.listingState === "rolling" ||
        listing.listingState === "stale";

      await db
        .update(tenders)
        .set({
          matchScore: merged.matchScore,
          listingState: listing.listingState,
          isClosed: listing.isClosed,
          hasHardDeadline: listing.hasHardDeadline,
          sourceStatus: listing.sourceStatus,
          relevanceReason: listing.relevanceReason ?? null,
          updatedAt: new Date(),
        })
        .where(eq(tenders.id, row.id));

      if (wasPipeline && nowHidden) marked += 1;
      if (wasHidden && nowPipeline) restored += 1;
    }
  }

  return { marked, restored, orgs: orgRows.length };
}
