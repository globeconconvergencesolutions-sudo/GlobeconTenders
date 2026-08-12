import { cache } from "react";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { organizations, orgMemberships, type Organization } from "@/lib/db/schema";
import {
  orgAllowsLogin,
  ORG_STATUS_SUSPENDED,
} from "@/lib/platform/org-status";

export type ResolvedOrganization = Pick<
  Organization,
  | "id"
  | "name"
  | "slug"
  | "status"
  | "templateId"
  | "templateVersion"
  | "plan"
  | "trialEndsAt"
  | "maxSeats"
  | "maxSources"
  | "syncIntervalHours"
>;

export const getOrganizationBySlug = cache(
  async (slug: string): Promise<ResolvedOrganization | null> => {
    const db = getDb();
    if (!db) return null;

    const [row] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        status: organizations.status,
        templateId: organizations.templateId,
        templateVersion: organizations.templateVersion,
        plan: organizations.plan,
        trialEndsAt: organizations.trialEndsAt,
        maxSeats: organizations.maxSeats,
        maxSources: organizations.maxSources,
        syncIntervalHours: organizations.syncIntervalHours,
      })
      .from(organizations)
      .where(eq(organizations.slug, slug))
      .limit(1);

    return row ?? null;
  },
);

export const getOrganizationById = cache(
  async (orgId: number): Promise<ResolvedOrganization | null> => {
    const db = getDb();
    if (!db || !Number.isFinite(orgId) || orgId <= 0) return null;

    const [row] = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        status: organizations.status,
        templateId: organizations.templateId,
        templateVersion: organizations.templateVersion,
        plan: organizations.plan,
        trialEndsAt: organizations.trialEndsAt,
        maxSeats: organizations.maxSeats,
        maxSources: organizations.maxSources,
        syncIntervalHours: organizations.syncIntervalHours,
      })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);

    return row ?? null;
  },
);

export async function listActiveOrganizations(): Promise<ResolvedOrganization[]> {
  const db = getDb();
  if (!db) return [];

  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      status: organizations.status,
      templateId: organizations.templateId,
      templateVersion: organizations.templateVersion,
      plan: organizations.plan,
      trialEndsAt: organizations.trialEndsAt,
      maxSeats: organizations.maxSeats,
      maxSources: organizations.maxSources,
      syncIntervalHours: organizations.syncIntervalHours,
    })
    .from(organizations)
    .where(eq(organizations.status, "active"));
}

export async function requireOrganizationBySlug(slug: string) {
  const org = await getOrganizationBySlug(slug);
  if (!org) {
    throw new Error("ORG_NOT_FOUND");
  }
  if (org.status === ORG_STATUS_SUSPENDED) {
    throw new Error("ORG_SUSPENDED");
  }
  if (!orgAllowsLogin(org.status)) {
    throw new Error("ORG_SUSPENDED");
  }
  return org;
}

export async function getOrgMembership(userId: number, orgId: number) {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({
      id: orgMemberships.id,
      orgId: orgMemberships.orgId,
      userId: orgMemberships.userId,
      role: orgMemberships.role,
      isActive: orgMemberships.isActive,
    })
    .from(orgMemberships)
    .where(
      and(
        eq(orgMemberships.orgId, orgId),
        eq(orgMemberships.userId, userId),
        eq(orgMemberships.isActive, true),
      ),
    )
    .limit(1);

  return row ?? null;
}
