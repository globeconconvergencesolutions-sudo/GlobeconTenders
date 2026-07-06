import { eq } from "drizzle-orm";

import {
  catalogSlugFor,
  getCatalogSource,
  SOURCE_CATALOG,
  type CatalogSource,
} from "@/lib/catalog/source-catalog";
import { getDb } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { slugify } from "@/lib/matching";
import { syncSource } from "@/lib/sync/engine";

export type InstallResult = {
  catalogId: string;
  status: "installed" | "exists" | "skipped" | "failed";
  sourceId?: number;
  sourceName?: string;
  sync?: {
    inserted: number;
    updated: number;
    errors: string[];
  };
  error?: string;
};

export async function getInstalledCatalogSlugs(): Promise<Set<string>> {
  const db = getDb();
  if (!db) return new Set();

  const rows = await db.select({ slug: sources.slug }).from(sources);
  return new Set(rows.map((row) => row.slug));
}

function catalogValues(source: CatalogSource, userId?: number) {
  const slug = catalogSlugFor(source);
  return {
    name: source.name,
    slug,
    type: "link" as const,
    adapter: source.adapter,
    url: source.feedUrl ?? source.url,
    color: source.color,
    enabled: true,
    isBuiltIn: true,
    createdById: userId,
  };
}

export async function installCatalogSource(
  catalogId: string,
  userId?: number,
  options: { sync?: boolean } = { sync: true },
): Promise<InstallResult> {
  const source = getCatalogSource(catalogId);
  if (!source) {
    return { catalogId, status: "failed", error: "Unknown catalog source" };
  }

  if (!source.syncSupported) {
    return {
      catalogId,
      status: "skipped",
      error: "This portal is browse-only — open the site to view live tenders",
    };
  }

  const db = getDb();
  if (!db) {
    return { catalogId, status: "failed", error: "Database not configured" };
  }

  const slug = catalogSlugFor(source);
  const [existing] = await db
    .select()
    .from(sources)
    .where(eq(sources.slug, slug))
    .limit(1);

  if (existing) {
    return {
      catalogId,
      status: "exists",
      sourceId: existing.id,
      sourceName: existing.name,
    };
  }

  try {
    const [created] = await db
      .insert(sources)
      .values(catalogValues(source, userId))
      .returning();

    let syncResult;
    if (options.sync !== false) {
      try {
        syncResult = await syncSource(created.id);
      } catch (error) {
        syncResult = {
          sourceId: created.id,
          sourceName: created.name,
          inserted: 0,
          updated: 0,
          errors: [
            error instanceof Error ? error.message : "Initial sync failed",
          ],
        };
      }
    }

    return {
      catalogId,
      status: "installed",
      sourceId: created.id,
      sourceName: created.name,
      sync: syncResult
        ? {
            inserted: syncResult.inserted,
            updated: syncResult.updated,
            errors: syncResult.errors,
          }
        : undefined,
    };
  } catch (error) {
    return {
      catalogId,
      status: "failed",
      error: error instanceof Error ? error.message : "Install failed",
    };
  }
}

export async function installFeaturedCatalogSources(
  userId?: number,
): Promise<InstallResult[]> {
  const featured = SOURCE_CATALOG.filter((source) => source.featured);
  const results: InstallResult[] = [];

  for (const source of featured) {
    results.push(await installCatalogSource(source.id, userId));
  }

  return results;
}

export async function installAllCatalogSources(
  userId?: number,
): Promise<InstallResult[]> {
  const results: InstallResult[] = [];

  for (const source of SOURCE_CATALOG) {
    results.push(await installCatalogSource(source.id, userId));
  }

  return results;
}

export function customSourceSlug(name: string): string {
  return slugify(name);
}
