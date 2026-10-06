import { readFileSync } from "node:fs";

import { neon } from "@neondatabase/serverless";

import { getDatabaseUrl, isUsingSecondaryDatabase } from "../lib/env";

function statements(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith("--"));
}

async function main() {
  if (!isUsingSecondaryDatabase()) {
    throw new Error("Refusing to apply: USE_SECONDARY_DATABASE is not set.");
  }

  const sql = neon(getDatabaseUrl());
  const existing = await sql`
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'market_fields'
    LIMIT 1
  `;
  if (existing.length > 0) {
    console.log("public.market_fields already exists. Refusing to move tables again.");
    return;
  }
  await sql`CREATE SCHEMA IF NOT EXISTS prior_pis`;
  await sql`
    DO $$
    DECLARE r record;
    BEGIN
      FOR r IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
      LOOP
        EXECUTE format('ALTER TABLE public.%I SET SCHEMA prior_pis', r.tablename);
      END LOOP;
    END $$;
  `;
  console.log("Moved existing public tables into prior_pis.");

  const files = ["drizzle/0000_phase1.sql", "drizzle/0001_pis_base.sql"];
  for (const file of files) {
    const parts = statements(file);
    console.log(file, parts.length, "statements");
    for (const statement of parts) {
      const preview = statement.slice(0, 90).replace(/\s+/g, " ");
      try {
        await sql.query(statement);
        console.log("ok", preview);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("failed", preview);
        console.error(message.split("\n")[0]);
        process.exit(1);
      }
    }
  }
  console.log("Schema applied.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message.split("\n")[0] : error);
  process.exit(1);
});
