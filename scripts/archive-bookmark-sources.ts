import { and, eq, inArray, isNull } from "drizzle-orm";

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import { organizations, sources } from "../lib/db/schema";

loadEnv();

/**
 * Archive browse-only / bookmark sources (generic-link) that cannot sync.
 *
 *   npx tsx scripts/archive-bookmark-sources.ts globecon
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

  const bookmarks = await db
    .select({
      id: sources.id,
      name: sources.name,
      slug: sources.slug,
      adapter: sources.adapter,
      url: sources.url,
    })
    .from(sources)
    .where(
      and(
        eq(sources.orgId, org.id),
        isNull(sources.archivedAt),
        inArray(sources.adapter, ["generic-link"]),
      ),
    );

  if (bookmarks.length === 0) {
    console.log(`No active bookmark sources on ${org.slug}.`);
    return;
  }

  for (const row of bookmarks) {
    await db
      .update(sources)
      .set({
        archivedAt: new Date(),
        enabled: false,
      })
      .where(eq(sources.id, row.id));
    console.log(`Archived bookmark: ${row.name} (${row.slug}) → ${row.url}`);
  }

  console.log(`Archived ${bookmarks.length} bookmark source(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
