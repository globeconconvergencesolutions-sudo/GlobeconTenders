import { assignableRoles } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/db/schema";

export type TeamUserRef = {
  id: number;
  role: UserRole;
};

/** Super admin accounts cannot be modified or removed by anyone. */
export function isProtectedAccount(user: Pick<TeamUserRef, "role">): boolean {
  return user.role === "super_admin";
}

export function canActorManageTarget(
  actor: TeamUserRef,
  target: TeamUserRef,
): boolean {
  if (actor.id === target.id) return false;
  if (isProtectedAccount(target)) return false;
  if (actor.role === "super_admin") return true;
  if (actor.role === "admin") return target.role !== "super_admin";
  return false;
}

export function rolesActorCanAssign(actorRole: UserRole): UserRole[] {
  return assignableRoles(actorRole);
}

export function canActorAssignRole(
  actorRole: UserRole,
  nextRole: UserRole,
): boolean {
  return rolesActorCanAssign(actorRole).includes(nextRole);
}
