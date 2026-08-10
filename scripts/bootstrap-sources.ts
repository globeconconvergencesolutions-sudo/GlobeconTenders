import { and, count, eq } from "drizzle-orm";

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import { organizations, sources, tenders } from "../lib/db/schema";
import { installFeaturedCatalogSources } from "../lib/sources/install";
import { syncAllEnabledSources } from "../lib/sync/engine";

loadEnv();

async function main() {
  const db = getDb();
  if (!db) {
    console.error("Database not configured");
    process.exit(1);
  }

  const [org] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.slug, "globecon"))
    .limit(1);

  if (!org) {
    console.error("Default org 'globecon' not found. Run pnpm db:upgrade first.");
    process.exit(1);
  }

  console.log("=== Installing featured catalog sources ===");
  const installResults = await installFeaturedCatalogSources(org.id);

  for (const result of installResults) {
    const syncInfo = result.sync
      ? ` (+${result.sync.inserted} new, ${result.sync.updated} updated)`
      : "";
    const err = result.sync?.errors?.length
      ? ` errors: ${result.sync.errors.slice(0, 2).join("; ")}`
      : "";
    console.log(
      `- [${result.status}] ${result.sourceName ?? result.catalogId}${syncInfo}${err}`,
    );
    if (result.error) console.log(`  ${result.error}`);
  }

  console.log("\n=== Running full sync ===");
  const syncResults = await syncAllEnabledSources("manual-bootstrap", org.id);

  for (const result of syncResults) {
    console.log(
      `- ${result.sourceName}: +${result.inserted} new, ${result.updated} updated${
        result.errors.length ? ` ERR: ${result.errors[0]}` : ""
      }`,
    );
  }

  const [sourceRow] = await db
    .select({ count: count() })
    .from(sources)
    .where(eq(sources.orgId, org.id));
  const [tenderRow] = await db
    .select({ count: count() })
    .from(tenders)
    .where(eq(tenders.orgId, org.id));
  const [openRow] = await db
    .select({ count: count() })
    .from(tenders)
    .where(and(eq(tenders.orgId, org.id), eq(tenders.isClosed, false)));

  const sourceList = await db
    .select({ name: sources.name, slug: sources.slug })
    .from(sources)
    .where(and(eq(sources.orgId, org.id), eq(sources.enabled, true)));

  console.log("\n=== Totals ===");
  console.log(`Enabled sources: ${sourceRow.count}`);
  console.log(`Tenders in DB: ${tenderRow.count} (${openRow.count} open)`);
  console.log("Active sources:", sourceList.map((s) => s.name).join(", "));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
