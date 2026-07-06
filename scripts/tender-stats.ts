import { count, eq } from "drizzle-orm";

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import { sources, tenders } from "../lib/db/schema";

loadEnv();

async function main() {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const bySource = await db
    .select({ name: sources.name, total: count() })
    .from(tenders)
    .innerJoin(sources, eq(tenders.sourceId, sources.id))
    .groupBy(sources.name);

  const [totals] = await db
    .select({
      total: count(),
      open: count(tenders.id),
    })
    .from(tenders)
    .where(eq(tenders.isClosed, false));

  const [all] = await db.select({ total: count() }).from(tenders);

  console.log("Tenders by source:");
  for (const row of bySource) {
    console.log(`  ${row.name}: ${row.total}`);
  }
  console.log(`\nTotal: ${all.total} (${totals.total} open)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
