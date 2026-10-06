import { requireSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/tenant/org-context";

export async function requirePisEditor() {
  const user = await requireSessionUser();
  if (!user.orgId) throw new Error("UNAUTHORIZED");
  if (user.role === "viewer") throw new Error("FORBIDDEN");
  const org = await getOrgContext();
  if (!org.features.pis) throw new Error("FEATURE_DISABLED");
  const db = getDb();
  if (!db) throw new Error("Database not configured");
  return { user, db, orgId: user.orgId };
}

export async function requirePisAdmin() {
  const ctx = await requirePisEditor();
  if (ctx.user.role !== "admin" && ctx.user.role !== "super_admin") {
    throw new Error("FORBIDDEN");
  }
  return ctx;
}
