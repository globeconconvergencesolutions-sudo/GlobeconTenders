import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "@/lib/env";

import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let dbUrl = "";

export function getDb() {
  let url: string | null = null;
  try {
    url = getDatabaseUrl();
  } catch {
    url = null;
  }
  if (!url) return null;

  if (!db || dbUrl !== url) {
    dbUrl = url;
    const sql = neon(url);
    db = drizzle(sql, { schema });
  }

  return db;
}

export function isDatabaseConfigured(): boolean {
  try {
    return Boolean(getDatabaseUrl());
  } catch {
    return false;
  }
}

export { schema };
