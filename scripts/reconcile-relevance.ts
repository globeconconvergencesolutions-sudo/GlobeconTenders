import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import { organizations } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { reconcileTenderRelevance } from "../lib/tenders/lifecycle";

loadEnv();

/**
 * One-shot: mark below-threshold tenders as irrelevant so they leave Live.
 *
 * Usage:
 *   npx tsx scripts/reconcile-relevance.ts           # all orgs
 *   npx tsx scripts/reconcile-relevance.ts globecon  # by slug
 *   npx tsx scripts/reconcile-relevance.ts 1         # by org id
 */
async function main() {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const arg = process.argv[2]?.trim();
  let orgId: number | undefined;

  if (arg) {
    const asNum = Number(arg);
    if (Number.isFinite(asNum) && asNum > 0) {
      orgId = asNum;
    } else {
      const [org] = await db
        .select({ id: organizations.id, slug: organizations.slug })
        .from(organizations)
        .where(eq(organizations.slug, arg.toLowerCase()))
        .limit(1);
      if (!org) throw new Error(`Organization not found: ${arg}`);
      orgId = org.id;
      console.log(`Org ${org.slug} (id=${org.id})`);
    }
  }

  const result = await reconcileTenderRelevance(orgId);
  console.log(
    `Marked ${result.marked} irrelevant, restored ${result.restored} across ${result.orgs} org(s).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
