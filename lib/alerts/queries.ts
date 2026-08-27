import {
  and,
  asc,
  desc,
  eq,
  gte,
  inArray,
  lte,
  not,
  sql,
} from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  countries,
  DEFAULT_NOTIFICATION_PREFS,
  emailAlertLog,
  emailDigestLog,
  regions,
  sources,
  tenders,
  orgMemberships,
  users,
  type FilterState,
  type NotificationPrefs,
} from "@/lib/db/schema";
import type { AlertTenderRow } from "@/lib/email/templates";
import { buildFilterConditions } from "@/lib/tenders/queries";
import {
  getWorkspaceSettings,
  isUserIncludedInAlerts,
} from "@/lib/settings/workspace";
import { requireCurrentOrg } from "@/lib/tenant/context";

export type AlertType = "closing_soon" | "high_match";

export type AlertUser = {
  id: number;
  email: string;
  name: string;
  orgId: number;
  filterState: FilterState;
  notificationPrefs: NotificationPrefs;
};

async function resolveOrgId(orgId?: number) {
  if (orgId != null && orgId > 0) return orgId;
  const { auth } = await import("@/auth");
  const session = await auth();
  const sessionOrgId = Number(session?.user?.orgId ?? 0);
  if (sessionOrgId > 0) return sessionOrgId;
  const org = await requireCurrentOrg();
  return org.id;
}

const ALERT_LIMIT = 25;

function normalizePrefs(prefs: NotificationPrefs | null | undefined): NotificationPrefs {
  return {
    ...DEFAULT_NOTIFICATION_PREFS,
    ...prefs,
  };
}

function selectAlertTenderFields() {
  return {
    id: tenders.id,
    title: tenders.title,
    referenceId: tenders.referenceId,
    sourceName: sources.name,
    sourceColor: sources.color,
    category: tenders.category,
    deadline: tenders.deadline,
    matchScore: tenders.matchScore,
    url: tenders.url,
    regionLabel: tenders.regionLabel,
    countryLabel: tenders.countryLabel,
  };
}

async function getSentTenderIds(
  userId: number,
  alertType: AlertType,
): Promise<Set<number>> {
  const db = getDb();
  if (!db) return new Set();

  const rows = await db
    .select({ tenderId: emailAlertLog.tenderId })
    .from(emailAlertLog)
    .where(
      and(
        eq(emailAlertLog.userId, userId),
        eq(emailAlertLog.alertType, alertType),
      ),
    );

  return new Set(rows.map((row) => row.tenderId));
}

export async function getAlertUsers(orgId?: number): Promise<AlertUser[]> {
  const db = getDb();
  if (!db) return [];

  const resolvedOrgId = await resolveOrgId(orgId);
  const workspace = await getWorkspaceSettings(resolvedOrgId);
  if (!workspace.notifications.enabled) return [];

  const includedIds = workspace.notifications.includedUserIds;
  if (includedIds.length === 0) return [];

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      filterState: orgMemberships.filterState,
      notificationPrefs: users.notificationPrefs,
    })
    .from(users)
    .innerJoin(
      orgMemberships,
      and(
        eq(orgMemberships.userId, users.id),
        eq(orgMemberships.orgId, resolvedOrgId),
        eq(orgMemberships.isActive, true),
      ),
    )
    .where(and(eq(users.isActive, true), inArray(users.id, includedIds)));

  return rows
    .map((row) => ({
      ...row,
      orgId: resolvedOrgId,
      filterState: row.filterState ?? {
        sourceIds: [],
        serviceLineIds: [],
        regionIds: [],
        countryIds: [],
      },
      notificationPrefs: normalizePrefs(row.notificationPrefs),
    }))
    .filter((row) => {
      if (!isUserIncludedInAlerts(row.id, workspace.notifications)) {
        return false;
      }
      if (
        workspace.notifications.respectUserOptOut &&
        !row.notificationPrefs.enabled
      ) {
        return false;
      }
      return true;
    });
}

export async function getUserNotificationPrefs(
  userId: number,
): Promise<NotificationPrefs> {
  const db = getDb();
  if (!db) return DEFAULT_NOTIFICATION_PREFS;

  const [row] = await db
    .select({ notificationPrefs: users.notificationPrefs })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return normalizePrefs(row?.notificationPrefs);
}

export async function updateUserNotificationPrefs(
  userId: number,
  prefs: NotificationPrefs,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  await db
    .update(users)
    .set({ notificationPrefs: prefs, updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getRecentDigestLogs(userId: number, limit = 5) {
  const db = getDb();
  if (!db) return [];

  return db
    .select()
    .from(emailDigestLog)
    .where(eq(emailDigestLog.userId, userId))
    .orderBy(desc(emailDigestLog.sentAt))
    .limit(limit);
}

export async function getClosingSoonAlerts(
  user: AlertUser,
): Promise<AlertTenderRow[]> {
  if (!user.notificationPrefs.closingSoon) return [];

  const db = getDb();
  if (!db) return [];

  const sentIds = await getSentTenderIds(user.id, "closing_soon");
  const filterWhere = buildFilterConditions({
    hideClosed: true,
    listingBucket: "live",
    filterState: user.filterState,
  });

  const now = new Date();
  const horizon = new Date(
    now.getTime() + user.notificationPrefs.closingSoonDays * 24 * 60 * 60 * 1000,
  );

  const conditions = [
    eq(tenders.orgId, user.orgId),
    filterWhere,
    eq(tenders.hasHardDeadline, true),
    gte(tenders.deadline, now),
    lte(tenders.deadline, horizon),
  ];

  if (sentIds.size > 0) {
    conditions.push(not(inArray(tenders.id, [...sentIds])));
  }

  const rows = await db
    .select(selectAlertTenderFields())
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .leftJoin(regions, eq(tenders.regionId, regions.id))
    .leftJoin(countries, eq(tenders.countryId, countries.id))
    .where(and(...conditions))
    .orderBy(asc(tenders.deadline))
    .limit(ALERT_LIMIT);

  return rows;
}

export async function getHighMatchAlerts(
  user: AlertUser,
  options: { sinceHours?: number } = {},
): Promise<AlertTenderRow[]> {
  if (!user.notificationPrefs.highMatch) return [];

  const db = getDb();
  if (!db) return [];

  const sentIds = await getSentTenderIds(user.id, "high_match");
  const filterWhere = buildFilterConditions({
    hideClosed: true,
    listingBucket: "live",
    filterState: user.filterState,
  });

  const conditions = [
    eq(tenders.orgId, user.orgId),
    filterWhere,
    gte(tenders.matchScore, user.notificationPrefs.highMatchThreshold),
  ];

  if (options.sinceHours) {
    conditions.push(
      sql`${tenders.updatedAt} >= now() - (${options.sinceHours} * interval '1 hour')`,
    );
  }

  if (sentIds.size > 0) {
    conditions.push(not(inArray(tenders.id, [...sentIds])));
  }

  const rows = await db
    .select(selectAlertTenderFields())
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .leftJoin(regions, eq(tenders.regionId, regions.id))
    .leftJoin(countries, eq(tenders.countryId, countries.id))
    .where(and(...conditions))
    .orderBy(desc(tenders.matchScore), asc(tenders.deadline))
    .limit(ALERT_LIMIT);

  return rows;
}

export async function logAlertDeliveries(
  userId: number,
  alertType: AlertType,
  tenderIds: number[],
  orgId: number,
) {
  if (tenderIds.length === 0) return;

  const db = getDb();
  if (!db) return;

  await db
    .insert(emailAlertLog)
    .values(
      tenderIds.map((tenderId) => ({
        orgId,
        userId,
        tenderId,
        alertType,
      })),
    )
    .onConflictDoNothing({
      target: [
        emailAlertLog.userId,
        emailAlertLog.tenderId,
        emailAlertLog.alertType,
      ],
    });
}

export async function logDigestResult(input: {
  orgId: number;
  userId: number;
  status: "success" | "failed" | "skipped";
  closingCount: number;
  highMatchCount: number;
  errorMessage?: string;
}) {
  const db = getDb();
  if (!db) return;

  await db.insert(emailDigestLog).values({
    orgId: input.orgId,
    userId: input.userId,
    status: input.status,
    closingCount: input.closingCount,
    highMatchCount: input.highMatchCount,
    errorMessage: input.errorMessage ?? null,
  });
}

export async function getEmailAlertStatus() {
  const db = getDb();
  if (!db) {
    return {
      recentDigests: [],
      totalAlertsSent: 0,
    };
  }

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(emailAlertLog);

  const recentDigests = await db
    .select({
      id: emailDigestLog.id,
      userId: emailDigestLog.userId,
      userName: users.name,
      userEmail: users.email,
      status: emailDigestLog.status,
      closingCount: emailDigestLog.closingCount,
      highMatchCount: emailDigestLog.highMatchCount,
      errorMessage: emailDigestLog.errorMessage,
      sentAt: emailDigestLog.sentAt,
    })
    .from(emailDigestLog)
    .leftJoin(users, eq(emailDigestLog.userId, users.id))
    .orderBy(desc(emailDigestLog.sentAt))
    .limit(10);

  return {
    recentDigests,
    totalAlertsSent: Number(totalRow?.count ?? 0),
  };
}
