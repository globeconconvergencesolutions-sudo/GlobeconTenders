import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";

import { getAuthDb } from "@/lib/db/auth-db";
import { baAccount, baUser } from "@/lib/db/schema";

/** Better Auth local credential issuer (`createLocalAccountIssuer("credential")`). */
export const BA_CREDENTIAL_ISSUER = "local:credential";

type AppUserRow = {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
};

/**
 * Keep Better Auth user/account rows in sync with app `users` (integer ids).
 * ba_user.id = String(users.id); credential password = users.password_hash.
 * Credential accountId must equal userId (Better Auth 1.7 sign-in check).
 */
export async function ensureBetterAuthUser(user: AppUserRow): Promise<string> {
  const db = getAuthDb();
  if (!db) throw new Error("DATABASE_URL is required");

  const userId = String(user.id);
  const now = new Date();

  const [existing] = await db
    .select({ id: baUser.id })
    .from(baUser)
    .where(eq(baUser.id, userId))
    .limit(1);

  if (!existing) {
    await db.insert(baUser).values({
      id: userId,
      name: user.name,
      email: user.email,
      emailVerified: true,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(baUser)
      .set({
        name: user.name,
        email: user.email,
        updatedAt: now,
      })
      .where(eq(baUser.id, userId));
  }

  const [account] = await db
    .select({ id: baAccount.id })
    .from(baAccount)
    .where(
      and(
        eq(baAccount.userId, userId),
        eq(baAccount.providerId, "credential"),
      ),
    )
    .limit(1);

  if (!account) {
    await db.insert(baAccount).values({
      id: nanoid(),
      issuer: BA_CREDENTIAL_ISSUER,
      accountId: userId,
      providerId: "credential",
      userId,
      password: user.passwordHash,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await db
      .update(baAccount)
      .set({
        issuer: BA_CREDENTIAL_ISSUER,
        accountId: userId,
        password: user.passwordHash,
        updatedAt: now,
      })
      .where(eq(baAccount.id, account.id));
  }

  return userId;
}

export async function syncBetterAuthPassword(
  userId: number,
  passwordHash: string,
): Promise<void> {
  const db = getAuthDb();
  if (!db) return;

  const id = String(userId);
  const now = new Date();

  await db
    .update(baAccount)
    .set({ password: passwordHash, updatedAt: now })
    .where(
      and(eq(baAccount.userId, id), eq(baAccount.providerId, "credential")),
    );
}

export async function ensureBetterAuthUserFromIds(args: {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
}): Promise<void> {
  await ensureBetterAuthUser(args);
}
