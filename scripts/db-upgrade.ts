import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

import { getDatabaseUrl } from "../lib/env";

const statements = [
  `DO $$ BEGIN
    CREATE TYPE "user_role" AS ENUM ('super_admin', 'admin', 'analyst', 'viewer');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "source_type" AS ENUM ('link', 'document');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN
    CREATE TYPE "source_adapter" AS ENUM ('world-bank', 'tender-yetu', 'generic-rss', 'generic-link', 'document');
  EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN ALTER TYPE "source_adapter" ADD VALUE IF NOT EXISTS 'kenya-ppip'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
  `DO $$ BEGIN ALTER TYPE "source_adapter" ADD VALUE IF NOT EXISTS 'afdb-procurement'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,

  `CREATE TABLE IF NOT EXISTS "users" (
    "id" serial PRIMARY KEY NOT NULL,
    "email" text NOT NULL UNIQUE,
    "name" text NOT NULL,
    "password_hash" text NOT NULL,
    "role" "user_role" DEFAULT 'viewer' NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "filter_state" jsonb DEFAULT '{"sourceIds":[],"serviceLineIds":[],"regionIds":[],"countryIds":[]}'::jsonb,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS "regions" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL UNIQUE,
    "keywords" text[] DEFAULT '{}' NOT NULL,
    "is_built_in" boolean DEFAULT true NOT NULL,
    "created_by_id" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS "countries" (
    "id" serial PRIMARY KEY NOT NULL,
    "region_id" integer NOT NULL REFERENCES "regions"("id"),
    "name" text NOT NULL,
    "slug" text NOT NULL UNIQUE,
    "keywords" text[] DEFAULT '{}' NOT NULL,
    "is_built_in" boolean DEFAULT true NOT NULL,
    "created_by_id" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS "service_lines" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL UNIQUE,
    "keywords" text[] DEFAULT '{}' NOT NULL,
    "is_built_in" boolean DEFAULT true NOT NULL,
    "created_by_id" integer REFERENCES "users"("id"),
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,

  `CREATE TABLE IF NOT EXISTS "tender_service_line_matches" (
    "tender_id" integer NOT NULL REFERENCES "tenders"("id") ON DELETE cascade,
    "service_line_id" integer NOT NULL REFERENCES "service_lines"("id") ON DELETE cascade,
    "score" integer DEFAULT 0 NOT NULL,
    PRIMARY KEY ("tender_id", "service_line_id")
  );`,

  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "type" "source_type" DEFAULT 'link' NOT NULL;`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "adapter" "source_adapter" DEFAULT 'generic-link' NOT NULL;`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "url" text;`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "cloudinary_public_id" text;`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "cloudinary_url" text;`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "cloudinary_folder" text;`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "is_built_in" boolean DEFAULT false NOT NULL;`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "created_by_id" integer REFERENCES "users"("id");`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp;`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "last_sync_status" text;`,
  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "last_sync_error" text;`,

  `ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "description" text;`,
  `ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "region_id" integer REFERENCES "regions"("id");`,
  `ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "country_id" integer REFERENCES "countries"("id");`,
  `ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "region_label" text;`,
  `ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "country_label" text;`,
  `ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "match_score" integer DEFAULT 0 NOT NULL;`,
  `ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;`,

  `ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS "source_id" integer REFERENCES "sources"("id");`,
  `ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS "triggered_by" text DEFAULT 'manual' NOT NULL;`,
  `ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'success' NOT NULL;`,
  `ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS "error_message" text;`,

  `CREATE UNIQUE INDEX IF NOT EXISTS "tenders_source_reference_idx" ON "tenders" ("source_id", "reference_id");`,

  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notification_prefs" jsonb DEFAULT '{"enabled":true,"closingSoon":true,"closingSoonDays":3,"highMatch":true,"highMatchThreshold":30,"afterSync":true}'::jsonb;`,

  `CREATE TABLE IF NOT EXISTS "email_alert_log" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "tender_id" integer NOT NULL REFERENCES "tenders"("id") ON DELETE cascade,
    "alert_type" text NOT NULL,
    "sent_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "email_alert_log_user_tender_type_idx" ON "email_alert_log" ("user_id", "tender_id", "alert_type");`,

  `CREATE TABLE IF NOT EXISTS "email_digest_log" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer REFERENCES "users"("id") ON DELETE cascade,
    "status" text DEFAULT 'success' NOT NULL,
    "closing_count" integer DEFAULT 0 NOT NULL,
    "high_match_count" integer DEFAULT 0 NOT NULL,
    "error_message" text,
    "sent_at" timestamp DEFAULT now() NOT NULL
  );`,

  `UPDATE "sources" SET "adapter" = 'world-bank', "type" = 'link', "is_built_in" = true,
    "url" = 'https://search.worldbank.org/api/v2/procnotices'
    WHERE "slug" = 'world-bank';`,
  `UPDATE "sources" SET "adapter" = 'tender-yetu', "type" = 'link', "is_built_in" = true,
    "url" = 'https://tenderyetu.com'
    WHERE "slug" = 'tender-yetu';`,
  `INSERT INTO "sources" ("name", "slug", "type", "adapter", "url", "color", "enabled", "is_built_in")
    SELECT 'Kenya PPIP (IFMIS)', 'kenya-ppip', 'link', 'kenya-ppip', 'https://tenders.go.ke', '#059669', true, true
    WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE "slug" = 'kenya-ppip');`,
  `INSERT INTO "sources" ("name", "slug", "type", "adapter", "url", "color", "enabled", "is_built_in")
    SELECT 'AfDB — Specific Procurement', 'afdb-spn', 'link', 'afdb-procurement',
      'https://www.afdb.org/en/documents/project-related-procurement/procurement-notices/specific-procurement-notices',
      '#009844', true, true
    WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE "slug" = 'afdb-spn');`,
  `INSERT INTO "sources" ("name", "slug", "type", "adapter", "url", "color", "enabled", "is_built_in")
    SELECT 'AfDB — Invitation for Bids', 'afdb-ifb', 'link', 'afdb-procurement',
      'https://www.afdb.org/en/documents/project-related-procurement/procurement-notices/invitation-for-bids',
      '#047857', true, true
    WHERE NOT EXISTS (SELECT 1 FROM "sources" WHERE "slug" = 'afdb-ifb');`,

  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;`,
  `ALTER TABLE "service_lines" ADD COLUMN IF NOT EXISTS "archived_at" timestamp;`,

  `CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "token_hash" text NOT NULL,
    "expires_at" timestamp NOT NULL,
    "used_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "password_reset_tokens_hash_idx" ON "password_reset_tokens" ("token_hash");`,
];

async function upgrade() {
  const db = drizzle(neon(getDatabaseUrl()));

  for (const statement of statements) {
    console.log("Running:", statement.slice(0, 80).replace(/\s+/g, " "), "...");
    await db.execute(sql.raw(statement));
  }

  console.log("Database upgrade complete.");
}

upgrade().catch((error) => {
  console.error(error);
  process.exit(1);
});
