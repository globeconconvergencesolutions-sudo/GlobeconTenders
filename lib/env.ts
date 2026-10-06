import { config } from "dotenv";

let loaded = false;
let overrideUrl: string | null = null;

/** Load .env.local then .env. Safe to call multiple times. */
export function loadEnv(): void {
  if (loaded) return;
  loaded = true;
  try {
    config({ path: ".env.local" });
    config({ path: ".env" });
  } catch {
    // Edge middleware cannot read the filesystem. Next inlines env instead.
  }
}

/**
 * Middleware runs on the edge, where `process.env` inside imported modules
 * may not see `.env.local`. The middleware entry sets the URL it resolved.
 */
export function setDatabaseUrlOverride(url: string | null | undefined): void {
  if (url) overrideUrl = url;
}

/**
 * Connection string for this process.
 * Set USE_SECONDARY_DATABASE=true to use SECONDARY_DATABASE_URL (PIS branch /
 * local build) and leave the primary DATABASE_URL untouched.
 */
export function getDatabaseUrl(): string {
  if (overrideUrl) return overrideUrl;
  loadEnv();
  const useSecondary =
    process.env.USE_SECONDARY_DATABASE === "true" ||
    process.env.USE_SECONDARY_DATABASE === "1";
  const url = useSecondary
    ? process.env.SECONDARY_DATABASE_URL
    : process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      useSecondary
        ? "USE_SECONDARY_DATABASE is set but SECONDARY_DATABASE_URL is missing."
        : "DATABASE_URL is not set. Copy .env.example to .env.local and add your Neon connection string.",
    );
  }
  return url;
}

export function isUsingSecondaryDatabase(): boolean {
  loadEnv();
  return (
    process.env.USE_SECONDARY_DATABASE === "true" ||
    process.env.USE_SECONDARY_DATABASE === "1"
  );
}
