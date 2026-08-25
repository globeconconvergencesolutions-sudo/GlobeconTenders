import { eq, sql } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";

export async function getUserSessionVersion(
  userId: number,
): Promise<number | null> {
  const db = getDb();
  if (!db || !Number.isFinite(userId) || userId <= 0) return null;

  const [row] = await db
    .select({ sessionVersion: users.sessionVersion })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return row?.sessionVersion ?? null;
}

/**
 * Invalidates every JWT issued before this bump. Cookie may linger; session is dead.
 */
export async function bumpUserSessionVersion(
  userId: number,
): Promise<number | null> {
  const db = getDb();
  if (!db || !Number.isFinite(userId) || userId <= 0) return null;

  const [row] = await db
    .update(users)
    .set({
      sessionVersion: sql`${users.sessionVersion} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({ sessionVersion: users.sessionVersion });

  return row?.sessionVersion ?? null;
}

export function sessionVersionsMatch(
  tokenVersion: unknown,
  dbVersion: number | null,
): boolean {
  if (dbVersion === null) return false;
  const tv =
    typeof tokenVersion === "number"
      ? tokenVersion
      : Number(tokenVersion ?? NaN);
  return Number.isFinite(tv) && tv === dbVersion;
}
