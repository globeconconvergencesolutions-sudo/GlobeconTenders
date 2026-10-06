import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

import { getDatabaseUrl } from "@/lib/env";

import * as schema from "./schema";

let authDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Better Auth Drizzle client (HTTP/fetch — safe on Netlify serverless).
 * Avoids bundling the `ws` WebSocket driver, which breaks frame masking in prod.
 */
export function getAuthDb() {
  let url: string | null = null;
  try {
    url = getDatabaseUrl();
  } catch {
    url = null;
  }
  if (!url) return null;

  if (!authDb) {
    const sql = neon(url);
    authDb = drizzle(sql, { schema });
  }

  return authDb;
}
