import { and, eq, ilike, isNull } from "drizzle-orm";

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import { organizations, sources, tenders } from "../lib/db/schema";
import { syncAllEnabledSources } from "../lib/sync/engine";
import { reconcileTenderListings, reconcileTenderRelevance } from "../lib/tenders/lifecycle";

loadEnv();

/**
 * Archive HR ingest source on Globecon (if present), then sync all enabled sources.
 *
 *   npx tsx scripts/clean-sync-org.ts
 *   npx tsx scripts/clean-sync-org.ts globecon
 */
async function main() {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const slug = process.argv[2]?.trim().toLowerCase() ?? "globecon";
  const [org] = await db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);
  if (!org) throw new Error(`Organization not found: ${slug}`);

  console.log(`Org ${org.slug} (id=${org.id})`);

  const hrSources = await db
    .select({ id: sources.id, name: sources.name, slug: sources.slug })
    .from(sources)
    .where(
      and(
        eq(sources.orgId, org.id),
        isNull(sources.archivedAt),
        ilike(sources.slug, "%n8n%hr%"),
      ),
    );

  const alsoNamed = await db
    .select({ id: sources.id, name: sources.name, slug: sources.slug })
    .from(sources)
    .where(
      and(
        eq(sources.orgId, org.id),
        isNull(sources.archivedAt),
        ilike(sources.name, "%HR Job%"),
      ),
    );

  const toArchive = new Map<number, { id: number; name: string; slug: string }>();
  for (const row of [...hrSources, ...alsoNamed]) {
    toArchive.set(row.id, row);
  }

  for (const source of toArchive.values()) {
    await db
      .update(sources)
      .set({
        archivedAt: new Date(),
        enabled: false,
      })
      .where(eq(sources.id, source.id));

    await db
      .update(tenders)
      .set({
        listingState: "irrelevant",
        isClosed: true,
        updatedAt: new Date(),
      })
      .where(eq(tenders.sourceId, source.id));

    console.log(`Archived HR source: ${source.name} (${source.slug})`);
  }

  if (toArchive.size === 0) {
    console.log("No active N8N HR sources to archive.");
  }

  console.log("Syncing all enabled sources…");
  const results = await syncAllEnabledSources("manual-clean", org.id);
  for (const result of results) {
    const err = result.errors.length ? ` ⚠ ${result.errors[0]}` : "";
    console.log(
      `  ${result.sourceName}: +${result.inserted} new, ${result.updated} updated, ${result.irrelevant} filtered${err}`,
    );
  }

  const listings = await reconcileTenderListings(org.id);
  const relevance = await reconcileTenderRelevance(org.id);
  console.log(
    `Reconcile: listings=${listings.updated}, marked=${relevance.marked}, restored=${relevance.restored}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
