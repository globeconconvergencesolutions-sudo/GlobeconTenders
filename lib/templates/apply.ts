import { eq } from "drizzle-orm";

import { GLOBECON_REGIONS } from "@/lib/catalog/regions";
import { GLOBECON_SERVICE_LINES } from "@/lib/catalog/service-lines";
import { getDb } from "@/lib/db";
import {
  countries,
  DEFAULT_WORKSPACE_SETTINGS,
  regions,
  serviceLines,
  workspaceSettings,
} from "@/lib/db/schema";
import { resolveLexicon } from "@/lib/lexicon";

import { loadTemplate } from "./load";
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
    keywords: ["HR", "talent", "recruitment", "people"],
  },
  {
    name: "Sales & Marketing",
    slug: "sales-marketing",
    keywords: ["sales", "marketing", "business development"],
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
    regions: [],
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

  const [existingLines] = await db
    .select({ id: serviceLines.id })
    .from(serviceLines)
    .where(eq(serviceLines.orgId, orgId))
    .limit(1);

  if (!existingLines) {
    await db.insert(serviceLines).values(
      pack.serviceLines.map((line) => ({
        orgId,
        name: line.name,
        slug: line.slug,
        keywords: line.keywords,
        isBuiltIn: true,
      })),
    );
  }

  const [existingRegion] = await db
    .select({ id: regions.id })
    .from(regions)
    .where(eq(regions.orgId, orgId))
    .limit(1);

  if (!existingRegion && pack.regions.length > 0) {
    for (const region of pack.regions) {
      const [createdRegion] = await db
        .insert(regions)
        .values({
          orgId,
          name: region.name,
          slug: region.slug,
          keywords: region.keywords,
          isBuiltIn: true,
        })
        .returning();

      if (region.countries.length > 0) {
        await db.insert(countries).values(
          region.countries.map((country) => ({
            orgId,
            name: country.name,
            slug: country.slug,
            keywords: country.keywords,
            regionId: createdRegion.id,
            isBuiltIn: true,
          })),
        );
      }
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
