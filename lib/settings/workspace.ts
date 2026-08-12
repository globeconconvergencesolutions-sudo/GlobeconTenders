import { and, eq } from "drizzle-orm";

import { requireCurrentOrg } from "@/lib/tenant/context";
import { resolveLexicon } from "@/lib/lexicon";
import { resolveFeatures, resolveLayout } from "@/lib/templates/resolve";
import { getDb } from "@/lib/db";
import {
  DEFAULT_WORKSPACE_SETTINGS,
  type DelegatableSettingsPermission,
  type WorkspaceBrandingSettings,
  type WorkspaceFeaturesSettings,
  type WorkspaceLayoutSettings,
  type WorkspaceLexiconSettings,
  type WorkspaceNotificationSettings,
  type WorkspaceSettingsPayload,
  organizations,
  orgMemberships,
  userPermissionGrants,
  users,
  workspaceSettings,
} from "@/lib/db/schema";

function normalizeNotifications(
  value: WorkspaceNotificationSettings | null | undefined,
): WorkspaceNotificationSettings {
  if (!value) return DEFAULT_WORKSPACE_SETTINGS.notifications;
  return {
    enabled: value.enabled !== false,
    mode: "explicit_list",
    includedUserIds: Array.isArray(value.includedUserIds)
      ? value.includedUserIds.filter((id) => Number.isFinite(id))
      : [],
    respectUserOptOut: value.respectUserOptOut !== false,
    defaultPrefs: {
      ...DEFAULT_WORKSPACE_SETTINGS.notifications.defaultPrefs,
      ...value.defaultPrefs,
    },
  };
}

async function resolveOrgId(orgId?: number): Promise<number> {
  if (orgId != null && orgId > 0) return orgId;
  const { auth } = await import("@/auth");
  const session = await auth();
  const sessionOrgId = Number(session?.user?.orgId ?? 0);
  if (sessionOrgId > 0) return sessionOrgId;
  const org = await requireCurrentOrg();
  return org.id;
}

async function getOrgTemplateId(orgId: number): Promise<string> {
  const db = getDb();
  if (!db) return "procurement";

  const [row] = await db
    .select({ templateId: organizations.templateId })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  return row?.templateId ?? "procurement";
}

async function ensureDefaultAlertRecipients(
  orgId: number,
  settings: WorkspaceSettingsPayload,
): Promise<WorkspaceSettingsPayload> {
  const db = getDb();
  if (!db || settings.notifications.includedUserIds.length > 0) {
    return settings;
  }

  const superAdmins = await db
    .select({ id: orgMemberships.userId })
    .from(orgMemberships)
    .innerJoin(users, eq(users.id, orgMemberships.userId))
    .where(
      and(
        eq(orgMemberships.orgId, orgId),
        eq(orgMemberships.role, "super_admin"),
        eq(orgMemberships.isActive, true),
        eq(users.isActive, true),
      ),
    );

  if (superAdmins.length === 0) return settings;

  const includedUserIds = superAdmins.map((row) => row.id);
  const notifications = {
    ...settings.notifications,
    includedUserIds,
  };

  await db
    .insert(workspaceSettings)
    .values({
      orgId,
      notifications,
      updatedById: superAdmins[0].id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceSettings.orgId,
      set: {
        notifications,
        updatedById: superAdmins[0].id,
        updatedAt: new Date(),
      },
    });

  return { ...settings, notifications };
}

export async function getWorkspaceSettings(
  orgId?: number,
): Promise<WorkspaceSettingsPayload> {
  const db = getDb();
  const resolvedOrgId = orgId ?? (await resolveOrgId());

  if (!db) return DEFAULT_WORKSPACE_SETTINGS;

  const [row] = await db
    .select()
    .from(workspaceSettings)
    .where(eq(workspaceSettings.orgId, resolvedOrgId))
    .limit(1);

  if (!row) {
    await db
      .insert(workspaceSettings)
      .values({ orgId: resolvedOrgId })
      .onConflictDoNothing();
    const templateId = await getOrgTemplateId(resolvedOrgId);
    return ensureDefaultAlertRecipients(resolvedOrgId, {
      ...DEFAULT_WORKSPACE_SETTINGS,
      features: resolveFeatures({}, templateId),
      layout: resolveLayout({}, templateId),
    });
  }

  const templateId = await getOrgTemplateId(resolvedOrgId);
  const settings = {
    organizationName: row.organizationName,
    notifications: normalizeNotifications(row.notifications),
    branding: row.branding ?? {},
    lexicon: resolveLexicon(row.lexicon),
    features: resolveFeatures(row.features, templateId),
    layout: resolveLayout(row.layout, templateId),
    catalog: row.catalog ?? DEFAULT_WORKSPACE_SETTINGS.catalog,
  };

  return ensureDefaultAlertRecipients(resolvedOrgId, settings);
}

export async function updateWorkspaceNotifications(
  notifications: WorkspaceNotificationSettings,
  updatedById: number,
  orgId?: number,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const resolvedOrgId = orgId ?? (await resolveOrgId());
  const normalized = normalizeNotifications(notifications);

  await db
    .insert(workspaceSettings)
    .values({
      orgId: resolvedOrgId,
      notifications: normalized,
      updatedById,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceSettings.orgId,
      set: {
        notifications: normalized,
        updatedById,
        updatedAt: new Date(),
      },
    });

  return normalized;
}

export async function updateWorkspaceBranding(
  branding: WorkspaceBrandingSettings,
  updatedById: number,
  orgId?: number,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const resolvedOrgId = orgId ?? (await resolveOrgId());

  await db
    .insert(workspaceSettings)
    .values({
      orgId: resolvedOrgId,
      branding,
      updatedById,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceSettings.orgId,
      set: {
        branding,
        updatedById,
        updatedAt: new Date(),
      },
    });

  return branding;
}

export async function updateWorkspaceLexicon(
  lexicon: Partial<WorkspaceLexiconSettings>,
  updatedById: number,
  orgId?: number,
) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const resolvedOrgId = orgId ?? (await resolveOrgId());
  const current = await getWorkspaceSettings(resolvedOrgId);
  const merged = resolveLexicon({ ...current.lexicon, ...lexicon });

  await db
    .insert(workspaceSettings)
    .values({
      orgId: resolvedOrgId,
      lexicon: merged,
      updatedById,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceSettings.orgId,
      set: {
        lexicon: merged,
        updatedById,
        updatedAt: new Date(),
      },
    });

  return merged;
}

export async function getUserGrants(userId: number, orgId?: number) {
  const db = getDb();
  if (!db) return [];

  const resolvedOrgId = orgId ?? (await resolveOrgId());

  return db
    .select({
      id: userPermissionGrants.id,
      permission: userPermissionGrants.permission,
      grantedById: userPermissionGrants.grantedById,
      createdAt: userPermissionGrants.createdAt,
    })
    .from(userPermissionGrants)
    .where(
      and(
        eq(userPermissionGrants.orgId, resolvedOrgId),
        eq(userPermissionGrants.userId, userId),
      ),
    );
}

export async function userHasGrant(
  userId: number,
  permission: DelegatableSettingsPermission,
  orgId?: number,
) {
  const grants = await getUserGrants(userId, orgId);
  return grants.some((grant) => grant.permission === permission);
}

export async function listNotificationDelegates(orgId?: number) {
  const db = getDb();
  if (!db) return [];

  const resolvedOrgId = orgId ?? (await resolveOrgId());

  return db
    .select({
      id: userPermissionGrants.id,
      userId: userPermissionGrants.userId,
      permission: userPermissionGrants.permission,
      grantedById: userPermissionGrants.grantedById,
      createdAt: userPermissionGrants.createdAt,
      userName: users.name,
      userEmail: users.email,
      userRole: orgMemberships.role,
      isActive: orgMemberships.isActive,
    })
    .from(userPermissionGrants)
    .innerJoin(users, eq(userPermissionGrants.userId, users.id))
    .innerJoin(
      orgMemberships,
      and(
        eq(orgMemberships.userId, users.id),
        eq(orgMemberships.orgId, userPermissionGrants.orgId),
      ),
    )
    .where(
      and(
        eq(userPermissionGrants.orgId, resolvedOrgId),
        eq(userPermissionGrants.permission, "settings:notifications"),
      ),
    );
}

export async function grantUserPermission(input: {
  orgId?: number;
  userId: number;
  permission: DelegatableSettingsPermission;
  grantedById: number;
}) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const resolvedOrgId = input.orgId ?? (await resolveOrgId());

  const [grant] = await db
    .insert(userPermissionGrants)
    .values({
      orgId: resolvedOrgId,
      userId: input.userId,
      permission: input.permission,
      grantedById: input.grantedById,
    })
    .onConflictDoNothing()
    .returning();

  return grant ?? null;
}

export async function revokeUserPermission(grantId: number, orgId?: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const resolvedOrgId = orgId ?? (await resolveOrgId());

  await db
    .delete(userPermissionGrants)
    .where(
      and(
        eq(userPermissionGrants.id, grantId),
        eq(userPermissionGrants.orgId, resolvedOrgId),
      ),
    );
}

export function isUserIncludedInAlerts(
  userId: number,
  notifications: WorkspaceNotificationSettings,
) {
  return notifications.includedUserIds.includes(userId);
}
