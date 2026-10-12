import { config } from "dotenv";

let loaded = false;

/** Load .env.local then .env. Safe to call multiple times. */
export function loadEnv(): void {
  if (loaded) return;
  config({ path: ".env.local" });
  config({ path: ".env" });
  loaded = true;
}

export function getDatabaseUrl(): string {
  loadEnv();
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
    );
  }
  return url;
}
