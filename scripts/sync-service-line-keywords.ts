import { and, eq, inArray, isNull } from "drizzle-orm";

import {
  GLOBECON_SERVICE_LINES,
  HR_DEPARTMENT_SLUGS,
} from "../lib/catalog/service-lines";
import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import { organizations, serviceLines } from "../lib/db/schema";
import { reconcileTenderRelevance } from "../lib/tenders/lifecycle";

loadEnv();

/**
 * Sync procurement catalog keywords, archive HR department lines, re-score Live.
 *
 *   npx tsx scripts/sync-service-line-keywords.ts
 *   npx tsx scripts/sync-service-line-keywords.ts globecon
 */
async function main() {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const arg = process.argv[2]?.trim().toLowerCase() ?? "globecon";
  const [org] = await db
    .select({ id: organizations.id, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, arg))
    .limit(1);

  if (!org) throw new Error(`Organization not found: ${arg}`);
  console.log(`Org ${org.slug} (id=${org.id})`);

  const archived = await db
    .update(serviceLines)
    .set({ archivedAt: new Date() })
    .where(
      and(
        eq(serviceLines.orgId, org.id),
        inArray(serviceLines.slug, [...HR_DEPARTMENT_SLUGS]),
        isNull(serviceLines.archivedAt),
      ),
    )
    .returning({ slug: serviceLines.slug });

  console.log(
    `Archived HR department lines: ${
      archived.map((r) => r.slug).join(", ") || "(none active)"
    }`,
  );

  let synced = 0;
  for (const line of GLOBECON_SERVICE_LINES) {
    const [existing] = await db
      .select({ id: serviceLines.id })
      .from(serviceLines)
      .where(
        and(eq(serviceLines.orgId, org.id), eq(serviceLines.slug, line.slug)),
      )
      .limit(1);

    if (!existing) {
      await db.insert(serviceLines).values({
        orgId: org.id,
        name: line.name,
        slug: line.slug,
        keywords: line.keywords,
        isBuiltIn: true,
      });
    } else {
      await db
        .update(serviceLines)
        .set({
          name: line.name,
          keywords: line.keywords,
          archivedAt: null,
        })
        .where(eq(serviceLines.id, existing.id));
    }
    synced += 1;
  }
  console.log(`Synced ${synced} procurement service line(s).`);

  const result = await reconcileTenderRelevance(org.id);
  console.log(
    `Relevance: marked ${result.marked} irrelevant, restored ${result.restored}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
