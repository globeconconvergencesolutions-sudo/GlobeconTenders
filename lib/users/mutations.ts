import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  countries,
  regions,
  serviceLines,
  sources,
  users,
} from "@/lib/db/schema";

export async function clearUserReferences(userId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  await Promise.all([
    db.update(sources).set({ createdById: null }).where(eq(sources.createdById, userId)),
    db.update(regions).set({ createdById: null }).where(eq(regions.createdById, userId)),
    db
      .update(countries)
      .set({ createdById: null })
      .where(eq(countries.createdById, userId)),
    db
      .update(serviceLines)
      .set({ createdById: null })
      .where(eq(serviceLines.createdById, userId)),
  ]);
}

export async function deleteUserById(userId: number) {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  await clearUserReferences(userId);
  await db.delete(users).where(eq(users.id, userId));
}
