import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import ws from "ws";

import * as schema from "./schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let authDb: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * WebSocket-backed Drizzle client for Better Auth (needs transactions).
 * App queries can keep using getDb() (neon-http).
 */
export function getAuthDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  if (!authDb) {
    pool = new Pool({ connectionString: url });
    authDb = drizzle(pool, { schema });
  }

  return authDb;
}
