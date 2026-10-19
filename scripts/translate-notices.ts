import { eq, isNull } from "drizzle-orm";

import { getDb } from "../lib/db";
import { tenders } from "../lib/db/schema";
import { loadEnv } from "../lib/env";
import {
  detectSourceLanguage,
  ensureEnglishReading,
  translationQuotaClosed,
} from "../lib/tenders/translate";

loadEnv();

async function main() {
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  const limit = Number(process.argv[2] ?? 250);
  const budget = { remaining: Number.isFinite(limit) && limit > 0 ? limit : 250 };

  const rows = await db
    .select({
      id: tenders.id,
      title: tenders.title,
      description: tenders.description,
      titleEn: tenders.titleEn,
      descriptionEn: tenders.descriptionEn,
      sourceLang: tenders.sourceLang,
    })
    .from(tenders)
    .where(isNull(tenders.titleEn));

  const pending = rows.filter((row) =>
    detectSourceLanguage(`${row.title} ${(row.description ?? "").slice(0, 280)}`),
  );

  let translated = 0;
  for (const row of pending) {
    if (translationQuotaClosed() || budget.remaining <= 0) break;
    const reading = await ensureEnglishReading(db, row, {
      delayMs: 120,
      budget,
      titlesOnly: true,
    });
    if (!reading.titleEn) continue;
    await db
      .update(tenders)
      .set({
        titleEn: reading.titleEn,
        sourceLang: reading.sourceLang,
        updatedAt: new Date(),
      })
      .where(eq(tenders.id, row.id));
    translated += 1;
  }

  const left = pending.length - translated;
  console.log(
    `English titles stored for ${translated} notices. ${left} foreign notices still waiting. Quota closed: ${translationQuotaClosed()}.`,
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message.split("\n")[0] : "translation backfill failed");
  process.exit(1);
});
