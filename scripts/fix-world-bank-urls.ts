import { sql } from "drizzle-orm";

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";

loadEnv();

/**
 * Rewrite broken World Bank /procurement/{id} URLs → /procurement-detail/{id}.
 */
async function main() {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const result = await db.execute(sql`
    UPDATE "tenders" AS t
    SET
      "url" = regexp_replace(
        t."url",
        '^(https?://projects\\.worldbank\\.org/en/projects-operations)/procurement/([^/?#]+)/?$',
        '\\1/procurement-detail/\\2'
      ),
      "updated_at" = now()
    FROM "sources" AS s
    WHERE t."source_id" = s."id"
      AND s."adapter" = 'world-bank'
      AND t."url" ~ 'projects\\.worldbank\\.org/en/projects-operations/procurement/[^/]+'
      AND t."url" !~ 'procurement-detail'
  `);

  const rowCount =
    typeof result === "object" &&
    result !== null &&
    "rowCount" in result &&
    typeof (result as { rowCount?: number }).rowCount === "number"
      ? (result as { rowCount: number }).rowCount
      : 0;

  console.log(`Rewrote ${rowCount} World Bank notice URL(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
