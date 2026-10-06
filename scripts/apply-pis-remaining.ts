import { readFileSync } from "node:fs";

import { neon } from "@neondatabase/serverless";

import { getDatabaseUrl, isUsingSecondaryDatabase } from "../lib/env";

async function main() {
  if (!isUsingSecondaryDatabase()) {
    throw new Error("Refusing to apply: USE_SECONDARY_DATABASE is not set.");
  }
  const sql = neon(getDatabaseUrl());
  const parts = readFileSync("drizzle/0002_pis_remaining.sql", "utf8")
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith("--"));
  for (const statement of parts) {
    await sql.query(statement);
    console.log("ok", statement.slice(0, 72).replace(/\s+/g, " "));
  }
  const tables = await sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN (
        'alert_reads',
        'opportunity_notes',
        'opportunity_relations',
        'org_hidden_catalog_lines'
      )
    ORDER BY table_name
  `;
  console.log(
    "tables",
    tables.map((row) => row.table_name).join(", "),
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message.split("\n")[0] : error);
  process.exit(1);
});
