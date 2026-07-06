import bcrypt from "bcryptjs";
import { count, eq } from "drizzle-orm";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { GLOBECON_REGIONS } from "../lib/catalog/regions";
import { GLOBECON_SERVICE_LINES } from "../lib/catalog/service-lines";
import { getDatabaseUrl } from "../lib/env";
import {
  countries,
  regions,
  serviceLines,
  sources,
  tenders,
  users,
} from "../lib/db/schema";
import { SEED_TENDERS } from "../lib/seed-data";
import { installFeaturedCatalogSources } from "../lib/sources/install";

async function seed() {
  const db = drizzle(neon(getDatabaseUrl()));

  const [userCount] = await db.select({ count: count() }).from(users);
  if (userCount.count === 0) {
    console.log("Creating super admin user...");
    const passwordHash = await bcrypt.hash(
      process.env.SEED_SUPER_ADMIN_PASSWORD ?? "Globecon@2026",
      12,
    );
    await db.insert(users).values({
      email: process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@globecon.com",
      name: "Globecon Super Admin",
      passwordHash,
      role: "super_admin",
    });
  }

  const [serviceLineCount] = await db.select({ count: count() }).from(serviceLines);
  if (serviceLineCount.count === 0) {
    console.log("Seeding service lines...");
    await db.insert(serviceLines).values(
      GLOBECON_SERVICE_LINES.map((line) => ({
        name: line.name,
        slug: line.slug,
        keywords: line.keywords,
        isBuiltIn: true,
      })),
    );
  }

  const [regionCount] = await db.select({ count: count() }).from(regions);
  if (regionCount.count === 0) {
    console.log("Seeding regions and countries...");
    for (const region of GLOBECON_REGIONS) {
      const [createdRegion] = await db
        .insert(regions)
        .values({
          name: region.name,
          slug: region.slug,
          keywords: region.keywords,
          isBuiltIn: true,
        })
        .returning();

      if (region.countries.length > 0) {
        await db.insert(countries).values(
          region.countries.map((country) => ({
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

  const [sourceCount] = await db.select({ count: count() }).from(sources);
  if (sourceCount.count === 0) {
    console.log("Seeding built-in sources...");
    await db.insert(sources).values([
      {
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
        name: "Tender Yetu",
        slug: "tender-yetu",
        type: "link",
        adapter: "tender-yetu",
        url: "https://www.tenderyetu.com",
        color: "#f97316",
        enabled: true,
        isBuiltIn: true,
      },
      {
        name: "Kenya PPIP (IFMIS)",
        slug: "kenya-ppip",
        type: "link",
        adapter: "kenya-ppip",
        url: "https://tenders.go.ke",
        color: "#059669",
        enabled: true,
        isBuiltIn: true,
      },
      {
        name: "AfDB — Specific Procurement",
        slug: "afdb-spn",
        type: "link",
        adapter: "afdb-procurement",
        url: "https://www.afdb.org/en/documents/project-related-procurement/procurement-notices/specific-procurement-notices",
        color: "#009844",
        enabled: true,
        isBuiltIn: true,
      },
      {
        name: "AfDB — Invitation for Bids",
        slug: "afdb-ifb",
        type: "link",
        adapter: "afdb-procurement",
        url: "https://www.afdb.org/en/documents/project-related-procurement/procurement-notices/invitation-for-bids",
        color: "#047857",
        enabled: true,
        isBuiltIn: true,
      },
    ]);
  }

  console.log("Ensuring featured catalog sources are installed...");
  const installResults = await installFeaturedCatalogSources();
  const installed = installResults.filter((r) => r.status === "installed");
  const synced = installResults.filter((r) => r.sync?.inserted);
  if (installed.length > 0) {
    console.log(
      `Installed ${installed.length} catalog source(s): ${installed.map((r) => r.sourceName).join(", ")}`,
    );
  }
  if (synced.length > 0) {
    console.log(
      `Initial sync pulled ${synced.reduce((sum, r) => sum + (r.sync?.inserted ?? 0), 0)} live tenders.`,
    );
  }

  const [tenderCount] = await db.select({ count: count() }).from(tenders);
  if (tenderCount.count === 0 && process.env.SEED_SAMPLE_TENDERS === "true") {
    const allSources = await db.select().from(sources);
    const sourceBySlug = Object.fromEntries(allSources.map((s) => [s.slug, s]));

    console.log("Seeding sample tenders...");
    await db.insert(tenders).values(
      SEED_TENDERS.map((t) => ({
        sourceId: sourceBySlug[t.sourceSlug].id,
        referenceId: t.referenceId,
        title: t.title,
        projectLabel: "World Bank Project",
        category: t.category,
        deadline: new Date(t.deadline),
        url: `https://projects.worldbank.org/en/projects-operations/procurement/${t.referenceId}`,
        isClosed: false,
        saved: false,
      })),
    );
  }

  console.log("Seed complete.");
  console.log(
    "Super admin login:",
    process.env.SEED_SUPER_ADMIN_EMAIL ?? "admin@globecon.com",
  );
  console.log(
    "Default password:",
    process.env.SEED_SUPER_ADMIN_PASSWORD ?? "Globecon@2026",
  );
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
