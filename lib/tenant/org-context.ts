import { eq } from "drizzle-orm";

import { resolveBranding, type ResolvedBranding } from "@/lib/branding/resolve";
import type {
  CustomFieldDefinition,
  WorkspaceFeaturesSettings,
  WorkspaceLayoutSettings,
  WorkspaceLexiconSettings,
} from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import {
  DEFAULT_PROCUREMENT_LEXICON,
  resolveLexicon,
} from "@/lib/lexicon";
import { loadTemplate } from "@/lib/templates/load";
import { getWorkspaceSettings } from "@/lib/settings/workspace";
import { DEFAULT_ORG_SLUG } from "@/lib/tenant/config";

import { getCurrentOrg } from "./context";
import { getOrganizationBySlug } from "./org";

export type OrgTemplateInfo = {
  id: string;
  version: string;
  name: string;
  description: string;
};

export type OrgCommercialInfo = {
  status: string;
  plan: string;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  showTrialBanner: boolean;
};

export type OrgContextValue = {
  orgSlug: string;
  orgName: string;
  organizationName: string;
  orgId: number;
  template: OrgTemplateInfo;
  branding: ResolvedBranding;
  lexicon: WorkspaceLexiconSettings;
  features: WorkspaceFeaturesSettings;
  layout: WorkspaceLayoutSettings;
  customFields: CustomFieldDefinition[];
  commercial: OrgCommercialInfo;
};

function trialDaysRemaining(trialEndsAt: Date | null): number | null {
  if (!trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function buildCommercialInfo(input: {
  status: string;
  plan: string;
  trialEndsAt: Date | null;
}): OrgCommercialInfo {
  const days = trialDaysRemaining(input.trialEndsAt);
  const showTrialBanner =
    input.plan === "trial" &&
    (input.status === "active" || input.status === "trial_expired");

  return {
    status: input.status,
    plan: input.plan,
    trialEndsAt: input.trialEndsAt?.toISOString() ?? null,
    trialDaysRemaining: days,
    showTrialBanner,
  };
}

function buildFallbackContext(): OrgContextValue {
  const template = loadTemplate("procurement");
  const lexicon = { ...DEFAULT_PROCUREMENT_LEXICON };
  const branding = resolveBranding({
    organizationName: "Globecon",
    branding: {},
    lexicon,
  });

  return {
    orgSlug: DEFAULT_ORG_SLUG,
    orgName: "Globecon",
    organizationName: "Globecon",
    orgId: 0,
    template: {
      id: template.id,
      version: template.version,
      name: template.name,
      description: template.description,
    },
    branding,
    lexicon,
    features: template.features,
    layout: template.layout,
    customFields: template.customFields ?? [],
    commercial: buildCommercialInfo({
      status: "active",
      plan: "enterprise",
      trialEndsAt: null,
    }),
  };
}

async function buildOrgContext(input: {
  id: number;
  name: string;
  slug: string;
  templateId: string;
  templateVersion: string;
  status: string;
  plan: string;
  trialEndsAt: Date | null;
}): Promise<OrgContextValue> {
  const settings = await getWorkspaceSettings(input.id);
  const template = loadTemplate(input.templateId);
  const lexicon = resolveLexicon(settings.lexicon);
  const branding = resolveBranding({
    organizationName: settings.organizationName,
    branding: settings.branding,
    lexicon,
  });

  return {
    orgSlug: input.slug,
    orgName: input.name,
    organizationName: settings.organizationName,
    orgId: input.id,
    template: {
      id: template.id,
      version: input.templateVersion,
      name: template.name,
      description: template.description,
    },
    branding,
    lexicon,
    features: settings.features,
    layout: settings.layout,
    customFields: template.customFields ?? [],
    commercial: buildCommercialInfo({
      status: input.status,
      plan: input.plan,
      trialEndsAt: input.trialEndsAt,
    }),
  };
}

export async function getOrgContext(): Promise<OrgContextValue> {
  const org = await getCurrentOrg();
  if (!org) return buildFallbackContext();
  return buildOrgContext(org);
}

export async function getOrgContextBySlug(
  slug: string,
): Promise<OrgContextValue> {
  const org = await getOrganizationBySlug(slug);
  if (!org) return buildFallbackContext();
  return buildOrgContext(org);
}

export async function getOrgContextByOrgId(
  orgId: number,
): Promise<OrgContextValue> {
  const db = getDb();
  if (!db) return buildFallbackContext();

  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      templateId: organizations.templateId,
      templateVersion: organizations.templateVersion,
      status: organizations.status,
      plan: organizations.plan,
      trialEndsAt: organizations.trialEndsAt,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) return buildFallbackContext();
  return buildOrgContext(org);
}

export type SharePresentation = Pick<
  OrgContextValue,
  "branding" | "lexicon" | "features" | "layout" | "customFields" | "organizationName"
>;

export function toSharePresentation(context: OrgContextValue): SharePresentation {
  return {
    branding: context.branding,
    lexicon: context.lexicon,
    features: context.features,
    layout: context.layout,
    customFields: context.customFields,
    organizationName: context.organizationName,
  };
}
