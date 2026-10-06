import { getDb } from "../lib/db";
import { loadEnv } from "../lib/env";
import { reconcileAllCatalogMatches } from "../lib/pis/catalog-match";
import { syncCatalogKeywords } from "../lib/pis/taxonomy";
import { reconcileTenderRelevance } from "../lib/tenders/lifecycle";

loadEnv();

/** Copy buyer phrases onto the catalog, retag stored notices, and refresh the live list. */
async function main() {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const phrases = await syncCatalogKeywords(db);
  const matched = await reconcileAllCatalogMatches(db);
  const relevance = await reconcileTenderRelevance();
  console.log(
    `Phrases updated on ${phrases} lines. Catalog matches refreshed for ${matched} notices. Live list: ${relevance.restored} restored, ${relevance.marked} moved aside, across ${relevance.orgs} workspaces.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Catalog phrase sync failed");
  process.exit(1);
});
