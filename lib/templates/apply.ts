import { and, eq } from "drizzle-orm";

import { GLOBECON_REGIONS } from "@/lib/catalog/regions";
import { GLOBECON_SERVICE_LINES } from "@/lib/catalog/service-lines";
import { getDb } from "@/lib/db";
import {
  countries,
  DEFAULT_WORKSPACE_SETTINGS,
  organizations,
  regions,
  serviceLines,
  workspaceSettings,
} from "@/lib/db/schema";
import { resolveLexicon } from "@/lib/lexicon";

import { isKnownTemplateId, loadTemplate } from "./load";
import type { TemplateCatalogSeed, TemplateRegionSeed } from "./types";

const HR_DEPARTMENTS: TemplateCatalogSeed[] = [
  {
    name: "Engineering",
    slug: "engineering",
    keywords: ["engineer", "developer", "software", "technical"],
  },
  {
    name: "Operations",
    slug: "operations",
    keywords: ["operations", "logistics", "supply chain"],
  },
  {
    name: "Finance",
    slug: "finance",
    keywords: ["finance", "accounting", "audit"],
  },
  {
    name: "Human Resources",
    slug: "human-resources",
    keywords: ["HR", "talent", "recruitment", "people", "human resource"],
  },
  {
    name: "Sales & Marketing",
    slug: "sales-marketing",
    keywords: ["sales", "marketing", "business development"],
  },
];

const HR_REGIONS: TemplateRegionSeed[] = [
  {
    name: "East Africa",
    slug: "east-africa",
    keywords: ["East Africa", "Kenya", "Uganda", "Tanzania", "Rwanda"],
    countries: [
      {
        name: "Kenya",
        slug: "kenya",
        keywords: ["Kenya", "Nairobi", "Mombasa", "KE"],
      },
    ],
  },
];

const CATALOG_PACKS: Record<
  string,
  { serviceLines: TemplateCatalogSeed[]; regions: TemplateRegionSeed[] }
> = {
  "globecon-procurement": {
    serviceLines: GLOBECON_SERVICE_LINES,
    regions: GLOBECON_REGIONS,
  },
  "hr-departments": {
    serviceLines: HR_DEPARTMENTS,
    regions: HR_REGIONS,
  },
};

export type TemplateApplySection =
  | "lexicon"
  | "branding"
  | "features"
  | "layout"
  | "catalog";

async function seedCatalogPack(orgId: number, catalogPack: string) {
  const db = getDb();
  if (!db) return;

  const pack = CATALOG_PACKS[catalogPack];
  if (!pack) return;

  const existingLines = await db
    .select({ slug: serviceLines.slug })
    .from(serviceLines)
    .where(eq(serviceLines.orgId, orgId));
  const existingLineSlugs = new Set(existingLines.map((row) => row.slug));
  const missingLines = pack.serviceLines.filter(
    (line) => !existingLineSlugs.has(line.slug),
  );
  if (missingLines.length > 0) {
    await db.insert(serviceLines).values(
      missingLines.map((line) => ({
        orgId,
        name: line.name,
        slug: line.slug,
        keywords: line.keywords,
        isBuiltIn: true,
      })),
    );
  }

  const existingRegions = await db
    .select({ id: regions.id, slug: regions.slug })
    .from(regions)
    .where(eq(regions.orgId, orgId));
  const existingRegionSlugs = new Set(existingRegions.map((row) => row.slug));

  for (const region of pack.regions) {
    let regionId = existingRegions.find((row) => row.slug === region.slug)?.id;
    if (!regionId && !existingRegionSlugs.has(region.slug)) {
      const [createdRegion] = await db
        .insert(regions)
        .values({
          orgId,
          name: region.name,
          slug: region.slug,
          keywords: region.keywords,
          isBuiltIn: true,
        })
        .returning({ id: regions.id });
      regionId = createdRegion.id;
      existingRegionSlugs.add(region.slug);
      existingRegions.push({ id: regionId, slug: region.slug });
    }
    if (!regionId || region.countries.length === 0) continue;

    const existingCountries = await db
      .select({ slug: countries.slug })
      .from(countries)
      .where(and(eq(countries.orgId, orgId), eq(countries.regionId, regionId)));
    const existingCountrySlugs = new Set(
      existingCountries.map((row) => row.slug),
    );
    const missingCountries = region.countries.filter(
      (country) => !existingCountrySlugs.has(country.slug),
    );
    if (missingCountries.length > 0) {
      await db.insert(countries).values(
        missingCountries.map((country) => ({
          orgId,
          name: country.name,
          slug: country.slug,
          keywords: country.keywords,
          regionId,
          isBuiltIn: true,
        })),
      );
    }
  }
}

export async function reapplyTemplateSections(input: {
  orgId: number;
  templateId: string;
  organizationName: string;
  sections: TemplateApplySection[];
  updatedById?: number;
}) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const template = loadTemplate(input.templateId);
  const lexicon = resolveLexicon(template.lexicon);
  const notifications: typeof DEFAULT_WORKSPACE_SETTINGS.notifications = {
    ...DEFAULT_WORKSPACE_SETTINGS.notifications,
    enabled: template.notifications.enabled,
  };

  const patch: Record<string, unknown> = {
    updatedAt: new Date(),
  };
  if (input.updatedById != null) {
    patch.updatedById = input.updatedById;
  }

  if (input.sections.includes("lexicon")) patch.lexicon = lexicon;
  if (input.sections.includes("branding")) patch.branding = template.branding;
  if (input.sections.includes("features")) patch.features = template.features;
  if (input.sections.includes("layout")) patch.layout = template.layout;

  await db
    .insert(workspaceSettings)
    .values({
      orgId: input.orgId,
      organizationName: input.organizationName,
      branding: template.branding,
      lexicon,
      features: template.features,
      layout: template.layout,
      notifications,
      catalog: DEFAULT_WORKSPACE_SETTINGS.catalog,
      updatedById: input.updatedById,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: workspaceSettings.orgId,
      set: patch,
    });

  if (input.sections.includes("catalog")) {
    await seedCatalogPack(input.orgId, template.catalogPack);
  }

  return template;
}

export async function applyTemplateToOrg(input: {
  orgId: number;
  templateId: string;
  organizationName: string;
}) {
  return reapplyTemplateSections({
    ...input,
    sections: ["lexicon", "branding", "features", "layout", "catalog"],
  });
}

/**
 * Option A: switch an org's vertical template (procurement ↔ hr).
 * Updates organizations.template_id and reapplies lexicon/layout/catalog.
 */
export async function switchOrgTemplate(input: {
  orgId: number;
  templateId: string;
  updatedById?: number;
}) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  if (!isKnownTemplateId(input.templateId)) {
    throw new Error("INVALID_TEMPLATE");
  }

  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      templateId: organizations.templateId,
    })
    .from(organizations)
    .where(eq(organizations.id, input.orgId))
    .limit(1);

  if (!org) throw new Error("ORG_NOT_FOUND");

  const template = loadTemplate(input.templateId);

  await db
    .update(organizations)
    .set({
      templateId: template.id,
      templateVersion: template.version,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, org.id));

  const [settings] = await db
    .select({ organizationName: workspaceSettings.organizationName })
    .from(workspaceSettings)
    .where(eq(workspaceSettings.orgId, org.id))
    .limit(1);

  await reapplyTemplateSections({
    orgId: org.id,
    templateId: template.id,
    organizationName: settings?.organizationName || org.name,
    sections: ["lexicon", "branding", "features", "layout", "catalog"],
    updatedById: input.updatedById,
  });

  return {
    orgId: org.id,
    previousTemplateId: org.templateId,
    templateId: template.id,
    templateVersion: template.version,
    templateName: template.name,
  };
}
