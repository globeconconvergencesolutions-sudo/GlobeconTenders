import { eq } from "drizzle-orm";

import { getDb } from "../lib/db";
import { loadEnv } from "../lib/env";
import { tenders } from "../lib/db/schema";
import { reconcileAllCatalogMatches } from "../lib/pis/catalog-match";
import { ensureEnglishReading, translationQuotaClosed } from "../lib/pis/translate";
import { reconcileTenderRelevance } from "../lib/tenders/lifecycle";

loadEnv();

async function main() {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const rows = await db
    .select({
      id: tenders.id,
      title: tenders.title,
      description: tenders.description,
      titleEn: tenders.titleEn,
      descriptionEn: tenders.descriptionEn,
      sourceLang: tenders.sourceLang,
    })
    .from(tenders);

  let translated = 0;
  let unchanged = 0;
  for (const row of rows) {
    if (translationQuotaClosed()) break;
    const reading = await ensureEnglishReading(db, row);
    const same =
      (reading.titleEn ?? null) === (row.titleEn ?? null) &&
      (reading.descriptionEn ?? null) === (row.descriptionEn ?? null) &&
      (reading.sourceLang ?? null) === (row.sourceLang ?? null);
    if (same) {
      unchanged += 1;
      continue;
    }
    await db
      .update(tenders)
      .set({
        titleEn: reading.titleEn,
        descriptionEn: reading.descriptionEn,
        sourceLang: reading.sourceLang,
        updatedAt: new Date(),
      })
      .where(eq(tenders.id, row.id));
    if (reading.titleEn) translated += 1;
  }

  const matched = await reconcileAllCatalogMatches(db);
  const relevance = await reconcileTenderRelevance();
  console.log(
    `English readings stored for ${translated} notices. ${unchanged} already current. Catalog matches refreshed for ${matched}. Live list restored ${relevance.restored}, moved aside ${relevance.marked}. Quota closed: ${translationQuotaClosed()}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "translation backfill failed");
  process.exit(1);
});
