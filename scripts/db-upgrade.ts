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

  `CREATE TABLE IF NOT EXISTS "tender_shares" (
    "id" serial PRIMARY KEY NOT NULL,
    "tender_id" integer NOT NULL REFERENCES "tenders"("id") ON DELETE cascade,
    "token_hash" text NOT NULL,
    "created_by_id" integer REFERENCES "users"("id") ON DELETE set null,
    "expires_at" timestamp NOT NULL,
    "view_count" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "tender_shares_token_hash_idx" ON "tender_shares" ("token_hash");`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "tender_shares_tender_id_idx" ON "tender_shares" ("tender_id");`,

  `CREATE TABLE IF NOT EXISTS "workspace_settings" (
    "id" integer PRIMARY KEY DEFAULT 1,
    "organization_name" text DEFAULT 'Globecon' NOT NULL,
    "notifications" jsonb DEFAULT '{"enabled":true,"mode":"explicit_list","includedUserIds":[],"respectUserOptOut":true,"defaultPrefs":{"enabled":true,"closingSoon":true,"closingSoonDays":3,"highMatch":true,"highMatchThreshold":30,"afterSync":true}}'::jsonb NOT NULL,
    "branding" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "catalog" jsonb DEFAULT '{"allowDeleteBuiltIn":true}'::jsonb NOT NULL,
    "updated_by_id" integer REFERENCES "users"("id") ON DELETE set null,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );`,
  `DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'workspace_settings' AND column_name = 'id'
    ) THEN
      INSERT INTO "workspace_settings" ("id")
      SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM "workspace_settings" WHERE "id" = 1);
    END IF;
  EXCEPTION WHEN others THEN NULL;
  END $$;`,

  `CREATE TABLE IF NOT EXISTS "user_permission_grants" (
    "id" serial PRIMARY KEY NOT NULL,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "permission" text NOT NULL,
    "granted_by_id" integer REFERENCES "users"("id") ON DELETE set null,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_permission_grants_user_permission_idx" ON "user_permission_grants" ("user_id", "permission");`,

  `CREATE TABLE IF NOT EXISTS "organizations" (
    "id" serial PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "slug" text NOT NULL,
    "status" text DEFAULT 'active' NOT NULL,
    "template_id" text DEFAULT 'procurement' NOT NULL,
    "template_version" text DEFAULT '1.0.0' NOT NULL,
    "plan" text DEFAULT 'trial' NOT NULL,
    "trial_ends_at" timestamp,
    "max_seats" integer DEFAULT 25 NOT NULL,
    "max_sources" integer DEFAULT 50 NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "organizations_slug_idx" ON "organizations" ("slug");`,

  `INSERT INTO "organizations" ("name", "slug", "status", "template_id", "template_version", "plan")
   SELECT 'Globecon', 'globecon', 'active', 'procurement', '1.0.0', 'enterprise'
   WHERE NOT EXISTS (SELECT 1 FROM "organizations" WHERE "slug" = 'globecon');`,

  `CREATE TABLE IF NOT EXISTS "org_memberships" (
    "id" serial PRIMARY KEY NOT NULL,
    "org_id" integer NOT NULL REFERENCES "organizations"("id") ON DELETE cascade,
    "user_id" integer NOT NULL REFERENCES "users"("id") ON DELETE cascade,
    "role" "user_role" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "org_memberships_org_user_idx" ON "org_memberships" ("org_id", "user_id");`,

  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "is_platform_admin" boolean DEFAULT false NOT NULL;`,

  `ALTER TABLE "sources" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "regions" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "countries" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "service_lines" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "sync_logs" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "email_alert_log" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "email_digest_log" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "tender_shares" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "user_permission_grants" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,
  `ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "org_id" integer REFERENCES "organizations"("id") ON DELETE cascade;`,

  `UPDATE "sources" SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'globecon' LIMIT 1) WHERE "org_id" IS NULL;`,
  `UPDATE "regions" SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'globecon' LIMIT 1) WHERE "org_id" IS NULL;`,
  `UPDATE "countries" SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'globecon' LIMIT 1) WHERE "org_id" IS NULL;`,
  `UPDATE "service_lines" SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'globecon' LIMIT 1) WHERE "org_id" IS NULL;`,
  `UPDATE "tenders" SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'globecon' LIMIT 1) WHERE "org_id" IS NULL;`,
  `UPDATE "sync_logs" SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'globecon' LIMIT 1) WHERE "org_id" IS NULL AND "source_id" IS NOT NULL;`,
  `UPDATE "email_alert_log" e SET "org_id" = t."org_id" FROM "tenders" t WHERE e."tender_id" = t."id" AND e."org_id" IS NULL;`,
  `UPDATE "email_digest_log" SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'globecon' LIMIT 1) WHERE "org_id" IS NULL;`,
  `UPDATE "tender_shares" ts SET "org_id" = t."org_id" FROM "tenders" t WHERE ts."tender_id" = t."id" AND ts."org_id" IS NULL;`,
  `UPDATE "user_permission_grants" SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'globecon' LIMIT 1) WHERE "org_id" IS NULL;`,
  `UPDATE "workspace_settings" SET "org_id" = (SELECT "id" FROM "organizations" WHERE "slug" = 'globecon' LIMIT 1) WHERE "org_id" IS NULL;`,

  `INSERT INTO "org_memberships" ("org_id", "user_id", "role", "is_active")
   SELECT o."id", u."id", u."role", u."is_active"
   FROM "organizations" o
   CROSS JOIN "users" u
   WHERE o."slug" = 'globecon'
     AND NOT EXISTS (
       SELECT 1 FROM "org_memberships" m
       WHERE m."org_id" = o."id" AND m."user_id" = u."id"
     )
     AND NOT EXISTS (
       SELECT 1 FROM "org_memberships" m2
       JOIN "organizations" o2 ON o2."id" = m2."org_id"
       WHERE m2."user_id" = u."id" AND o2."slug" <> 'globecon'
     );`,

  `UPDATE "users" SET "is_platform_admin" = true
   WHERE "role" = 'super_admin'
     AND "is_platform_admin" = false
     AND EXISTS (
       SELECT 1 FROM "org_memberships" m
       JOIN "organizations" o ON o."id" = m."org_id"
       WHERE m."user_id" = "users"."id"
         AND o."slug" = 'globecon'
         AND m."is_active" = true
         AND m."role" = 'super_admin'
     );`,

  `ALTER TABLE "sources" DROP CONSTRAINT IF EXISTS "sources_slug_key";`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "sources_org_slug_idx" ON "sources" ("org_id", "slug");`,
  `ALTER TABLE "regions" DROP CONSTRAINT IF EXISTS "regions_slug_key";`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "regions_org_slug_idx" ON "regions" ("org_id", "slug");`,
  `ALTER TABLE "countries" DROP CONSTRAINT IF EXISTS "countries_slug_key";`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "countries_org_slug_idx" ON "countries" ("org_id", "slug");`,
  `ALTER TABLE "service_lines" DROP CONSTRAINT IF EXISTS "service_lines_slug_key";`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "service_lines_org_slug_idx" ON "service_lines" ("org_id", "slug");`,

  `DROP INDEX IF EXISTS "user_permission_grants_user_permission_idx";`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "user_permission_grants_org_user_permission_idx" ON "user_permission_grants" ("org_id", "user_id", "permission");`,

  `DO $$ BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'workspace_settings' AND column_name = 'id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_name = 'workspace_settings' AND constraint_type = 'PRIMARY KEY'
        AND constraint_name = 'workspace_settings_pkey'
    ) THEN
      ALTER TABLE "workspace_settings" DROP CONSTRAINT "workspace_settings_pkey";
      ALTER TABLE "workspace_settings" ADD PRIMARY KEY ("org_id");
      ALTER TABLE "workspace_settings" DROP COLUMN IF EXISTS "id";
    END IF;
  EXCEPTION WHEN others THEN NULL;
  END $$;`,
  `ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "lexicon" jsonb DEFAULT '{}'::jsonb NOT NULL;`,
  `ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "features" jsonb DEFAULT '{}'::jsonb NOT NULL;`,
  `ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "layout" jsonb DEFAULT '{}'::jsonb NOT NULL;`,
  `ALTER TABLE "tenders" ADD COLUMN IF NOT EXISTS "custom_fields" jsonb DEFAULT '{}'::jsonb NOT NULL;`,
  `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "sync_interval_hours" integer DEFAULT 24 NOT NULL;`,
  `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_customer_id" text;`,
  `ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripe_subscription_id" text;`,
  `ALTER TABLE "workspace_settings" ADD COLUMN IF NOT EXISTS "onboarding" jsonb DEFAULT '{}'::jsonb NOT NULL;`,

  `ALTER TABLE "org_memberships" ADD COLUMN IF NOT EXISTS "filter_state" jsonb DEFAULT '{"sourceIds":[],"serviceLineIds":[],"regionIds":[],"countryIds":[]}'::jsonb;`,

  // Logout kill-switch: bump on sign-out; JWT with stale version is rejected.
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "session_version" integer DEFAULT 0 NOT NULL;`,

  // Better Auth tables (DB sessions — logout deletes the row)
  `CREATE TABLE IF NOT EXISTS "ba_user" (
    "id" text PRIMARY KEY NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL UNIQUE,
    "emailVerified" boolean DEFAULT false NOT NULL,
    "image" text,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "ba_session" (
    "id" text PRIMARY KEY NOT NULL,
    "expiresAt" timestamp NOT NULL,
    "token" text NOT NULL UNIQUE,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL,
    "ipAddress" text,
    "userAgent" text,
    "userId" text NOT NULL REFERENCES "ba_user"("id") ON DELETE cascade,
    "orgId" integer,
    "orgSlug" text,
    "role" text,
    "isPlatformAdmin" boolean DEFAULT false NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "ba_account" (
    "id" text PRIMARY KEY NOT NULL,
    "issuer" text DEFAULT 'local:credential' NOT NULL,
    "accountId" text NOT NULL,
    "providerId" text NOT NULL,
    "userId" text NOT NULL REFERENCES "ba_user"("id") ON DELETE cascade,
    "accessToken" text,
    "refreshToken" text,
    "idToken" text,
    "accessTokenExpiresAt" timestamp,
    "refreshTokenExpiresAt" timestamp,
    "scope" text,
    "password" text,
    "createdAt" timestamp DEFAULT now() NOT NULL,
    "updatedAt" timestamp DEFAULT now() NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS "ba_verification" (
    "id" text PRIMARY KEY NOT NULL,
    "identifier" text NOT NULL,
    "value" text NOT NULL,
    "expiresAt" timestamp NOT NULL,
    "createdAt" timestamp DEFAULT now(),
    "updatedAt" timestamp DEFAULT now()
  );`,

  // Better Auth 1.7 requires issuer + accountId === userId for credential sign-in
  `ALTER TABLE "ba_account" ADD COLUMN IF NOT EXISTS "issuer" text DEFAULT 'local:credential' NOT NULL;`,
  `UPDATE "ba_account"
   SET "issuer" = 'local:credential',
       "accountId" = "userId",
       "updatedAt" = now()
   WHERE "providerId" = 'credential'
     AND ("issuer" IS DISTINCT FROM 'local:credential' OR "accountId" IS DISTINCT FROM "userId");`,

  // Backfill Better Auth users/accounts from app users (id = users.id::text)
  `INSERT INTO "ba_user" ("id", "name", "email", "emailVerified", "createdAt", "updatedAt")
   SELECT u."id"::text, u."name", u."email", true, u."created_at", u."updated_at"
   FROM "users" u
   ON CONFLICT ("id") DO UPDATE SET
     "name" = EXCLUDED."name",
     "email" = EXCLUDED."email",
     "updatedAt" = EXCLUDED."updatedAt";`,

  `INSERT INTO "ba_account" ("id", "issuer", "accountId", "providerId", "userId", "password", "createdAt", "updatedAt")
   SELECT
     'cred_' || u."id"::text,
     'local:credential',
     u."id"::text,
     'credential',
     u."id"::text,
     u."password_hash",
     u."created_at",
     u."updated_at"
   FROM "users" u
   WHERE NOT EXISTS (
     SELECT 1 FROM "ba_account" a
     WHERE a."userId" = u."id"::text AND a."providerId" = 'credential'
   );`,
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
