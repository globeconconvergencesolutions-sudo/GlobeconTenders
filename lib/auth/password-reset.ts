import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { passwordResetTokens, users } from "@/lib/db/schema";

export const PASSWORD_RESET_EXPIRY_MINUTES = 60;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

export async function createPasswordResetToken(userId: number): Promise<string> {
  const db = getDb();
  if (!db) throw new Error("Database not configured");

  const rawToken = generatePasswordResetToken();
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60_000);

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt),
      ),
    );

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash,
    expiresAt,
  });

  return rawToken;
}

export async function verifyPasswordResetToken(rawToken: string) {
  const db = getDb();
  if (!db) return null;

  const tokenHash = hashToken(rawToken);
  const [row] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
      expiresAt: passwordResetTokens.expiresAt,
      usedAt: passwordResetTokens.usedAt,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
    })
    .from(passwordResetTokens)
    .innerJoin(users, eq(passwordResetTokens.userId, users.id))
    .where(eq(passwordResetTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.usedAt || row.expiresAt < new Date() || !row.isActive) {
    return null;
  }

  return row;
}

export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = getDb();
  if (!db) return { ok: false, error: "Database not configured" };

  const tokenRow = await verifyPasswordResetToken(rawToken);
  if (!tokenRow) {
    return { ok: false, error: "This reset link is invalid or has expired" };
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await db
    .update(users)
    .set({ passwordHash, updatedAt: new Date() })
    .where(eq(users.id, tokenRow.userId));

  const { syncBetterAuthPassword } = await import(
    "@/lib/auth/ensure-better-auth-user"
  );
  await syncBetterAuthPassword(tokenRow.userId, passwordHash);

  await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, tokenRow.id));

  return { ok: true };
}

export async function findActiveUserByEmail(email: string) {
  const db = getDb();
  if (!db) return null;

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.email, email.trim().toLowerCase()))
    .limit(1);

  if (!user?.isActive) return null;
  return user;
}
