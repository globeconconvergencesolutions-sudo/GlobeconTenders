import { eq } from "drizzle-orm";

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import { sources } from "../lib/db/schema";
import { syncSource } from "../lib/sync/engine";

loadEnv();

async function main() {
  const slug = process.argv[2] ?? "world-bank";
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.slug, slug))
    .limit(1);

  if (!source) throw new Error(`Source not found: ${slug}`);

  console.log(`Syncing ${source.name}...`);
  const result = await syncSource(source.id);
  console.log(
    `Done: +${result.inserted} new, ${result.updated} updated${
      result.errors.length ? `\nErrors: ${result.errors.slice(0, 3).join("; ")}` : ""
    }`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
