import { readFileSync } from "node:fs";

import { neon } from "@neondatabase/serverless";

import { getDatabaseUrl, isUsingSecondaryDatabase } from "../lib/env";

async function main() {
  if (!isUsingSecondaryDatabase()) {
    throw new Error("Refusing to apply: USE_SECONDARY_DATABASE is not set.");
  }
  const sql = neon(getDatabaseUrl());
  const parts = readFileSync("drizzle/0003_notice_translation.sql", "utf8")
    .split("--> statement-breakpoint")
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && !part.startsWith("--"));
  for (const statement of parts) {
    await sql.query(statement);
    console.log("ok", statement.slice(0, 72).replace(/\s+/g, " "));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message.split("\n")[0] : "apply failed");
  process.exit(1);
});
