import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import * as schema from "./schema";

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  if (!db) {
    const sql = neon(url);
    db = drizzle(sql, { schema });
  }

  return db;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export { schema };
