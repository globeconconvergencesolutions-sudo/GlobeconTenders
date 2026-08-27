"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Loader2,
  Shield,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";

import { RoleScopePreview } from "@/components/admin/role-access-guide";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiErrorAlert } from "@/components/ui/api-error-alert";
import { readApiError, type ParsedClientError } from "@/lib/api/client-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  canCreateUsers,
  canDeleteUsers,
  canManageUsers,
  ROLE_LABELS,
} from "@/lib/auth/permissions";
import {
  ROLE_BADGE_CLASS,
  roleSelectHint,
} from "@/lib/auth/role-guide";
import {
  canActorManageTarget,
  isProtectedAccount,
  rolesActorCanAssign,
} from "@/lib/auth/user-management";
import type { UserRole } from "@/lib/db/schema";
import { showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type TeamUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
};

type UsersManagementProps = {
  actorRole: UserRole;
  currentUserId: number;
};

const roleBadgeClass = ROLE_BADGE_CLASS;

export function UsersManagement({
  actorRole,
  currentUserId,
}: UsersManagementProps) {
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<ParsedClientError | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamUser | null>(null);
  const [removing, setRemoving] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("analyst");

  const assignableRoles = rolesActorCanAssign(actorRole);
  const canManage = canManageUsers(actorRole);
  const canCreate = canCreateUsers(actorRole);
  const canDelete = canDeleteUsers(actorRole);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load users");
      }
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function showSuccess(message: string) {
    showSuccessToast(message);
  }

  function canManageUser(user: TeamUser): boolean {
    return canActorManageTarget(
      { id: currentUserId, role: actorRole },
      { id: user.id, role: user.role },
    );
  }

  async function createUser() {
    setSaving(true);
    setFormError(null);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      });
      if (!response.ok) {
        setFormError(await readApiError(response, "Failed to create user"));
        return;
      }
      const data = await response.json();
      setDialogOpen(false);
      setName("");
      setEmail("");
      setPassword("");
      setRole("analyst");
      await loadUsers();
      const emailNote =
        data.emailSent === false
          ? " (welcome email could not be sent — check Gmail settings)"
          : data.emailSent
            ? " — welcome email sent"
            : "";
      showSuccess(`${data.user?.name ?? "User"} added to the team${emailNote}`);
    } catch {
      setFormError({ message: "Failed to create user — check your connection" });
    } finally {
      setSaving(false);
    }
  }

  async function updateUser(
    userId: number,
    patch: { role?: UserRole; isActive?: boolean },
  ) {
    setUpdatingId(userId);
    setError(null);
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Update failed");
      }

      setUsers((current) =>
        current.map((user) =>
          user.id === userId ? { ...user, ...data.user } : user,
        ),
      );

      if (typeof patch.isActive === "boolean") {
        const emailNote =
          patch.isActive === false && data.emailSent === false
            ? " (notification email could not be sent)"
            : patch.isActive === false && data.emailSent
              ? " — notification email sent"
              : "";
        showSuccess(
          patch.isActive
            ? `${data.user.name} is now active`
            : `${data.user.name} is now inactive${emailNote}`,
        );
      } else if (patch.role) {
        showSuccess(`${data.user.name} role updated to ${ROLE_LABELS[patch.role]}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
      await loadUsers();
    } finally {
      setUpdatingId(null);
    }
  }

  async function removeUser() {
    if (!removeTarget) return;
    setRemoving(true);
    setError(null);
    try {
      const response = await fetch(`/api/users/${removeTarget.id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Remove failed");
      }
      setRemoveTarget(null);
      await loadUsers();
      const emailNote =
        data.emailSent === false
          ? " (removal notification could not be sent)"
          : data.emailSent
            ? " — notification email sent"
            : "";
      showSuccess(`${removeTarget.name} was removed from the team${emailNote}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setRemoving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Team members</h2>
          <p className="text-sm text-muted-foreground">
            {canManage
              ? actorRole === "super_admin"
                ? "Manage all roles except other super admins."
                : "Manage admins, analysts, and viewers. Super admins are protected."
              : "View-only access to team accounts."}
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setDialogOpen(true)} className="w-full sm:w-auto">
            <UserPlus className="h-4 w-4" />
            Add team member
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading team...
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Users className="h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">No team members found.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-border">
            {users.map((user) => {
              const manageable = canManageUser(user);
              const protectedUser = isProtectedAccount(user);
              const isSelf = user.id === currentUserId;
              const busy = updatingId === user.id;

              return (
                <li
                  key={user.id}
                  className={cn(
                    "flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between",
                    !user.isActive && "bg-slate-50/80 dark:bg-muted/20",
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p
                        className={cn(
                          "font-medium",
                          !user.isActive && "text-muted-foreground line-through",
                        )}
                      >
                        {user.name}
                      </p>
                      <Badge className={cn("font-normal", roleBadgeClass[user.role])}>
                        {ROLE_LABELS[user.role]}
                      </Badge>
                      {!user.isActive && (
                        <Badge variant="outline" className="font-normal text-amber-700">
                          Inactive
                        </Badge>
                      )}
                      {protectedUser && (
                        <Badge variant="secondary" className="font-normal">
                          Protected
                        </Badge>
                      )}
                      {isSelf && (
                        <Badge variant="secondary" className="font-normal">
                          You
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {user.email}
                    </p>
                  </div>

                  {canManage && (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {manageable ? (
                        <>
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              void updateUser(user.id, { role: value as UserRole })
                            }
                            disabled={busy}
                          >
                            <SelectTrigger className="w-full sm:w-[200px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="min-w-[14rem]">
                              {assignableRoles.map((r) => (
                                <SelectItem
                                  key={r}
                                  value={r}
                                  className="items-start py-2"
                                >
                                  <span className="flex flex-col">
                                    <span>{ROLE_LABELS[r]}</span>
                                    <span className="text-[11px] text-muted-foreground">
                                      {roleSelectHint(r)}
                                    </span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-border">
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Switch
                                checked={user.isActive}
                                onCheckedChange={(checked) =>
                                  void updateUser(user.id, { isActive: checked })
                                }
                                aria-label={`Toggle active status for ${user.name}`}
                              />
                            )}
                            <span className="text-xs font-medium text-muted-foreground">
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                          </div>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
                            disabled={!canDelete || busy || removing}
                            onClick={() => setRemoveTarget(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                            Remove
                          </Button>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground sm:max-w-[12rem] sm:text-right">
                          {isSelf
                            ? "You cannot change your own access here"
                            : protectedUser
                              ? "Super admin accounts cannot be modified"
                              : "You cannot manage this account"}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-foreground dark:border-border dark:bg-muted/30">
        <Shield className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Super admins can manage everyone except other super admins. Admins can
          manage admins, analysts, and viewers — never super admins. Each person
          only sees the pages for their role. Inactive users cannot sign in.
          Removing a user permanently deletes their account.
        </p>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add team member</DialogTitle>
            <DialogDescription>
              Create an account with a single role. Pages and actions for that
              role are listed below — they cannot be mixed.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="user-name">Full name</Label>
              <Input
                id="user-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Analyst"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Work email</Label>
              <Input
                id="user-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@globecon.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Temporary password</Label>
              <Input
                id="user-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="min-w-[14rem]">
                  {assignableRoles.map((r) => (
                    <SelectItem key={r} value={r} className="items-start py-2">
                      <span className="flex flex-col">
                        <span>{ROLE_LABELS[r]}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {roleSelectHint(r)}
                        </span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-3 dark:border-border dark:bg-card">
                <RoleScopePreview role={role} />
              </div>
              <p className="text-xs text-muted-foreground">
                A welcome email with the login link and temporary password is
                sent automatically.
              </p>
            </div>
          </div>
          {formError && <ApiErrorAlert error={formError} />}
          <DialogFooter>
            <Button
              onClick={() => void createUser()}
              disabled={saving || !name || !email || password.length < 8}
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create user"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={removeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRemoveTarget(null);
        }}
        title={`Remove ${removeTarget?.name ?? "user"}?`}
        description={`This permanently deletes ${removeTarget?.email ?? "this account"}. They will lose access immediately and cannot be restored.`}
        confirmLabel="Remove permanently"
        destructive
        loading={removing}
        onConfirm={removeUser}
      />
    </div>
  );
}
