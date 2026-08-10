/**
 * Removes globecon memberships that were incorrectly added by db-upgrade.ts
 * (CROSS JOIN of all users into globecon). Keeps users who were part of the
 * original globecon seed (membership created with the first org batch).
 *
 * Run: npx tsx scripts/fix-stray-globecon-memberships.ts
 * Add --dry-run to preview without deleting.
 */
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "dotenv";

config({ path: ".env.local" });

const GLOBECON_SLUG = "globecon";
const dryRun = process.argv.includes("--dry-run");

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL missing");
    process.exit(1);
  }

  const db = drizzle(neon(url));

  // Original globecon members share the earliest membership timestamp batch.
  const [{ seed_ts: seedTs }] = (
    await db.execute(sql`
      SELECT MIN(m.created_at) AS seed_ts
      FROM org_memberships m
      JOIN organizations o ON o.id = m.org_id
      WHERE o.slug = ${GLOBECON_SLUG}
    `)
  ).rows as [{ seed_ts: string }];

  const stray = await db.execute(sql`
    SELECT m.id, u.email, o.slug AS other_org, m.created_at
    FROM org_memberships globecon_m
    JOIN organizations globecon ON globecon.id = globecon_m.org_id AND globecon.slug = ${GLOBECON_SLUG}
    JOIN users u ON u.id = globecon_m.user_id
    JOIN org_memberships m ON m.user_id = u.id AND m.org_id <> globecon.id
    JOIN organizations o ON o.id = m.org_id
    WHERE globecon_m.created_at > ${seedTs}::timestamp
      AND EXISTS (
        SELECT 1 FROM org_memberships other
        WHERE other.user_id = u.id
          AND other.org_id <> globecon.id
          AND other.created_at < globecon_m.created_at
      )
  `);

  console.log(
    dryRun ? "=== Dry run — stray globecon memberships ===" : "=== Removing stray globecon memberships ===",
  );

  if (stray.rows.length === 0) {
    console.log("Nothing to clean up.");
    return;
  }

  for (const row of stray.rows) {
    const r = row as {
      id: number;
      email: string;
      other_org: string;
      created_at: string;
    };
    console.log(
      `${r.email}: remove globecon membership (primary org: ${r.other_org}, added @ ${r.created_at})`,
    );
  }

  if (dryRun) return;

  const result = await db.execute(sql`
    DELETE FROM org_memberships globecon_m
    USING organizations globecon, users u
    WHERE globecon.slug = ${GLOBECON_SLUG}
      AND globecon_m.org_id = globecon.id
      AND globecon_m.user_id = u.id
      AND globecon_m.created_at > ${seedTs}::timestamp
      AND EXISTS (
        SELECT 1 FROM org_memberships other
        JOIN organizations o ON o.id = other.org_id AND o.slug <> ${GLOBECON_SLUG}
        WHERE other.user_id = u.id
          AND other.created_at < globecon_m.created_at
      )
    RETURNING u.email
  `);

  console.log(`\nRemoved ${result.rows.length} stray membership(s).`);
  for (const row of result.rows) {
    console.log(`  - ${(row as { email: string }).email}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
