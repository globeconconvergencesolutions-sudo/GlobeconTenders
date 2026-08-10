import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

import { getDb } from "@/lib/db";
import {
  DEFAULT_WORKSPACE_SETTINGS,
  orgMemberships,
  organizations,
  users,
  workspaceSettings,
  type UserRole,
} from "@/lib/db/schema";
import { planLimitsFor, TRIAL_DURATION_MS } from "@/lib/platform/plans";
import { isReservedOrgSlug, isValidOrgSlug } from "@/lib/tenant/resolution";
import { applyTemplateToOrg } from "@/lib/templates/apply";

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  templateId?: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  adminRole?: UserRole;
  /** When true, applies trial plan limits (self-serve signup). */
  selfServe?: boolean;
};

export async function listOrganizationsForPlatform() {
  const db = getDb();
  if (!db) return [];

  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      status: organizations.status,
      plan: organizations.plan,
      templateId: organizations.templateId,
      createdAt: organizations.createdAt,
    })
    .from(organizations)
    .orderBy(organizations.createdAt);
}

export async function createOrganization(input: CreateOrganizationInput) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const slug = input.slug.trim().toLowerCase();
  if (!isValidOrgSlug(slug) || isReservedOrgSlug(slug)) {
    throw new Error("INVALID_SLUG");
  }

  const email = input.adminEmail.trim().toLowerCase();

  const [existingOrg] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  if (existingOrg) {
    throw new Error("SLUG_TAKEN");
  }

  const [existingUser] = await db
    .select({
      id: users.id,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser) {
    const valid = await bcrypt.compare(
      input.adminPassword,
      existingUser.passwordHash,
    );
    if (!valid) {
      throw new Error("INVALID_CREDENTIALS");
    }
  }

  const adminRole = input.adminRole ?? "super_admin";
  const plan = input.selfServe ? "trial" : "trial";
  const limits = planLimitsFor(plan);

  const [org] = await db
    .insert(organizations)
    .values({
      name: input.name.trim(),
      slug,
      status: "active",
      templateId: input.templateId ?? "procurement",
      templateVersion: "1.0.0",
      plan,
      trialEndsAt: new Date(Date.now() + TRIAL_DURATION_MS),
      maxSeats: limits.maxSeats,
      maxSources: limits.maxSources,
      syncIntervalHours: limits.syncIntervalHours,
    })
    .returning();

  await db.insert(workspaceSettings).values({
    orgId: org.id,
    organizationName: input.name.trim(),
    notifications: DEFAULT_WORKSPACE_SETTINGS.notifications,
    branding: {},
    catalog: DEFAULT_WORKSPACE_SETTINGS.catalog,
  });

  await applyTemplateToOrg({
    orgId: org.id,
    templateId: input.templateId ?? "procurement",
    organizationName: input.name.trim(),
  });

  if (existingUser) {
    await db.insert(orgMemberships).values({
      orgId: org.id,
      userId: existingUser.id,
      role: adminRole,
    });

    return {
      org,
      admin: {
        id: existingUser.id,
        email,
        name: existingUser.name,
      },
    };
  }

  const passwordHash = await bcrypt.hash(input.adminPassword, 12);

  const [admin] = await db
    .insert(users)
    .values({
      email,
      name: input.adminName.trim(),
      passwordHash,
      role: adminRole,
    })
    .returning({ id: users.id, email: users.email, name: users.name });

  await db.insert(orgMemberships).values({
    orgId: org.id,
    userId: admin.id,
    role: adminRole,
  });

  return { org, admin };
}

export { buildOrgLoginUrl } from "@/lib/platform/login-url";
