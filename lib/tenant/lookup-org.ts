import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { organizations } from "@/lib/db/schema";

export async function lookupOrganizationStatus(
  slug: string,
): Promise<{ status: string; slug: string } | null> {
  const db = getDb();
  if (!db) return null;

  const [row] = await db
    .select({ status: organizations.status, slug: organizations.slug })
    .from(organizations)
    .where(eq(organizations.slug, slug))
    .limit(1);

  return row ?? null;
}
