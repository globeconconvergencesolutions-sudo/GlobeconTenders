import { eq, inArray } from "drizzle-orm";

import {
  getCloudinary,
  isCloudinaryConfigured,
} from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import {
  orgMemberships,
  organizations,
  sources,
  users,
} from "@/lib/db/schema";
import { DEFAULT_ORG_SLUG } from "@/lib/tenant/config";

export type DeleteOrganizationResult = {
  organization: {
    id: number;
    name: string;
    slug: string;
  };
  deletedUserIds: number[];
  cloudinaryDeleted: number;
  cloudinaryErrors: number;
};

/**
 * Permanently deletes a tenant and cascades all org-scoped rows via FKs.
 * Platform-admin only (enforced by the API). Never deletes the Globecon home org.
 * Also removes orphan users who have no remaining memberships (except platform admins).
 */
export async function deleteOrganizationForPlatform(
  orgId: number,
  confirmSlug: string,
): Promise<DeleteOrganizationResult> {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) throw new Error("ORG_NOT_FOUND");

  if (org.slug === DEFAULT_ORG_SLUG) {
    throw new Error("PROTECTED_ORG");
  }

  const expected = confirmSlug.trim().toLowerCase();
  if (!expected || expected !== org.slug.toLowerCase()) {
    throw new Error("CONFIRM_SLUG_MISMATCH");
  }

  const memberRows = await db
    .select({ userId: orgMemberships.userId })
    .from(orgMemberships)
    .where(eq(orgMemberships.orgId, orgId));

  const memberUserIds = [...new Set(memberRows.map((row) => row.userId))];

  const sourceMedia = await db
    .select({
      cloudinaryPublicId: sources.cloudinaryPublicId,
    })
    .from(sources)
    .where(eq(sources.orgId, orgId));

  const publicIds = sourceMedia
    .map((row) => row.cloudinaryPublicId)
    .filter((id): id is string => Boolean(id?.trim()));

  await db.delete(organizations).where(eq(organizations.id, orgId));

  let deletedUserIds: number[] = [];
  try {
    deletedUserIds = await deleteOrphanUsers(memberUserIds);
  } catch (error) {
    console.error(
      "[delete-org] orphan user cleanup failed after org delete",
      { orgId, error },
    );
  }

  const { cloudinaryDeleted, cloudinaryErrors } =
    await deleteCloudinaryAssets(publicIds);

  return {
    organization: org,
    deletedUserIds,
    cloudinaryDeleted,
    cloudinaryErrors,
  };
}

async function deleteOrphanUsers(memberUserIds: number[]): Promise<number[]> {
  if (memberUserIds.length === 0) return [];

  const db = getDb();
  if (!db) return [];

  const stillMembers = await db
    .select({ userId: orgMemberships.userId })
    .from(orgMemberships)
    .where(inArray(orgMemberships.userId, memberUserIds));

  const stillMemberIds = new Set(stillMembers.map((row) => row.userId));
  const orphanIds = memberUserIds.filter((id) => !stillMemberIds.has(id));
  if (orphanIds.length === 0) return [];

  const candidates = await db
    .select({ id: users.id, isPlatformAdmin: users.isPlatformAdmin })
    .from(users)
    .where(inArray(users.id, orphanIds));

  const removableIds = candidates
    .filter((row) => !row.isPlatformAdmin)
    .map((row) => row.id);

  if (removableIds.length === 0) return [];

  // Race-safe: skip anyone who gained a membership between checks.
  const blocked = await db
    .select({ userId: orgMemberships.userId })
    .from(orgMemberships)
    .where(inArray(orgMemberships.userId, removableIds));

  const blockedIds = new Set(blocked.map((row) => row.userId));
  const finalIds = removableIds.filter((id) => !blockedIds.has(id));
  if (finalIds.length === 0) return [];

  await db.delete(users).where(inArray(users.id, finalIds));
  return finalIds;
}

async function deleteCloudinaryAssets(publicIds: string[]): Promise<{
  cloudinaryDeleted: number;
  cloudinaryErrors: number;
}> {
  let cloudinaryDeleted = 0;
  let cloudinaryErrors = 0;

  if (publicIds.length === 0 || !isCloudinaryConfigured()) {
    return { cloudinaryDeleted, cloudinaryErrors };
  }

  try {
    const client = getCloudinary();
    const batchSize = 50;
    for (let i = 0; i < publicIds.length; i += batchSize) {
      const batch = publicIds.slice(i, i + batchSize);
      for (const resourceType of ["raw", "image", "auto"] as const) {
        try {
          const result = await client.api.delete_resources(batch, {
            resource_type: resourceType,
          });
          const deletedMap = (result?.deleted ?? {}) as Record<string, string>;
          for (const status of Object.values(deletedMap)) {
            if (status === "deleted") cloudinaryDeleted += 1;
          }
        } catch {
          // Other resource types often 404 — only count once per batch below.
        }
      }
    }
  } catch {
    cloudinaryErrors += publicIds.length;
  }

  return { cloudinaryDeleted, cloudinaryErrors };
}
