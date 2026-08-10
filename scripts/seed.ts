import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { GLOBECON_REGIONS } from "../lib/catalog/regions";
import { GLOBECON_SERVICE_LINES } from "../lib/catalog/service-lines";
import { getDatabaseUrl } from "../lib/env";
import {
  countries,
  orgMemberships,
  organizations,
  regions,
  serviceLines,
  sources,
  tenders,
  users,
  workspaceSettings,
} from "../lib/db/schema";
import { SEED_TENDERS } from "../lib/seed-data";
import { installFeaturedCatalogSources } from "../lib/sources/install";

const DEFAULT_ORG_SLUG = "globecon";

async function ensureDefaultOrg(db: ReturnType<typeof drizzle>) {
  const [existing] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, DEFAULT_ORG_SLUG))
    .limit(1);

  if (existing) return existing.id;

  const [created] = await db
    .insert(organizations)
    .values({
      name: "Globecon",
      slug: DEFAULT_ORG_SLUG,
      status: "active",
      templateId: "procurement",
      templateVersion: "1.0.0",
      plan: "enterprise",
    })
    .returning({ id: organizations.id });

  await db
    .insert(workspaceSettings)
    .values({ orgId: created.id, organizationName: "Globecon" })
    .onConflictDoNothing();

  return created.id;
}

async function seed() {
  const db = drizzle(neon(getDatabaseUrl()));
  const orgId = await ensureDefaultOrg(db);

  const [userCount] = await db.select({ count: count() }).from(users);
  if (userCount.count === 0) {
    console.log("Creating super admin user...");
    const passwordHash = await bcrypt.hash(
      process.env.SEED_SUPER_ADMIN_PASSWORD ?? "Globecon@2026",
      12,
    );
    const [createdUser] = await db
      .insert(users)
      .values({
        email: process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@globecon.com",
        name: "Globecon Super Admin",
        passwordHash,
        role: "super_admin",
        isPlatformAdmin: true,
      })
      .returning({ id: users.id });

    await db.insert(orgMemberships).values({
      orgId,
      userId: createdUser.id,
      role: "super_admin",
    });
  }

  const [serviceLineCount] = await db
    .select({ count: count() })
    .from(serviceLines)
    .where(eq(serviceLines.orgId, orgId));
  if (serviceLineCount.count === 0) {
    console.log("Seeding service lines...");
    await db.insert(serviceLines).values(
      GLOBECON_SERVICE_LINES.map((line) => ({
        orgId,
        name: line.name,
        slug: line.slug,
        keywords: line.keywords,
        isBuiltIn: true,
      })),
    );
  }

  const [regionCount] = await db
    .select({ count: count() })
    .from(regions)
    .where(eq(regions.orgId, orgId));
  if (regionCount.count === 0) {
    console.log("Seeding regions and countries...");
    for (const region of GLOBECON_REGIONS) {
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
            regionId: createdRegion.id,
            name: country.name,
            slug: country.slug,
            keywords: country.keywords,
            isBuiltIn: true,
          })),
        );
      }
    }
  }

  const [sourceCount] = await db
    .select({ count: count() })
    .from(sources)
    .where(eq(sources.orgId, orgId));
  if (sourceCount.count === 0) {
    console.log("Seeding built-in sources...");
    await db.insert(sources).values([
      {
        orgId,
        name: "World Bank",
        slug: "world-bank",
        type: "link",
        adapter: "world-bank",
        url: "https://search.worldbank.org/api/v2/procnotices",
        color: "#2563eb",
        enabled: true,
        isBuiltIn: true,
      },
      {
        orgId,
        name: "Tender Yetu",
        slug: "tender-yetu",
        type: "link",
        adapter: "tender-yetu",
        url: "https://www.tenderyetu.com",
        color: "#f97316",
        enabled: true,
        isBuiltIn: true,
      },
    ]);
  }

  const [tenderCount] = await db
    .select({ count: count() })
    .from(tenders)
    .where(eq(tenders.orgId, orgId));
  if (tenderCount.count === 0) {
    console.log("Seeding sample tenders...");
    const orgSources = await db
      .select()
      .from(sources)
      .where(eq(sources.orgId, orgId));
    const worldBank = orgSources.find((s) => s.slug === "world-bank");
    if (worldBank) {
      await db.insert(tenders).values(
        SEED_TENDERS.map((tender) => ({
          orgId,
          sourceId: worldBank.id,
          referenceId: tender.referenceId,
          title: tender.title,
          category: tender.category,
          deadline: new Date(tender.deadline),
        })),
      );
    }
  }

  console.log("Installing featured catalog sources...");
  await installFeaturedCatalogSources(orgId);

  console.log("Seed complete for org:", DEFAULT_ORG_SLUG);
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
