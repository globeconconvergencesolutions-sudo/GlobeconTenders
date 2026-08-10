"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SETTINGS_PERMISSION_LABELS } from "@/lib/auth/settings-labels";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type DelegateRow = {
  id: number;
  userId: number;
  permission: "settings:notifications";
  grantedById: number | null;
  createdAt: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  isActive: boolean;
};

type TeamOption = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

const roleBadgeClass: Record<UserRole, string> = {
  super_admin:
    "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  analyst:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  viewer: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

export function DelegationsSettings() {
  const [loading, setLoading] = useState(true);
  const [delegates, setDelegates] = useState<DelegateRow[]>([]);
  const [team, setTeam] = useState<TeamOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [granting, setGranting] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<DelegateRow | null>(null);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [delegationsRes, notificationsRes] = await Promise.all([
        fetch("/api/settings/delegations"),
        fetch("/api/settings/notifications"),
      ]);
      const delegationsData = await delegationsRes.json();
      const notificationsData = await notificationsRes.json();

      if (!delegationsRes.ok) {
        throw new Error(delegationsData.error ?? "Failed to load delegations");
      }

      setDelegates(
        (delegationsData.delegates ?? []).map((row: DelegateRow) => ({
          ...row,
          createdAt:
            typeof row.createdAt === "string"
              ? row.createdAt
              : new Date(row.createdAt).toISOString(),
        })),
      );

      if (notificationsRes.ok) {
        setTeam(
          (notificationsData.recipients ?? [])
            .filter((row: { isActive: boolean }) => row.isActive)
            .map((row: TeamOption) => ({
              id: row.id,
              name: row.name,
              email: row.email,
              role: row.role,
            })),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const delegatedUserIds = new Set(delegates.map((row) => row.userId));
  const grantableUsers = team.filter((user) => !delegatedUserIds.has(user.id));

  async function grantAccess() {
    if (!selectedUserId) return;
    setGranting(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/delegations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: Number(selectedUserId),
          permission: "settings:notifications",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to grant access");
      }
      setDialogOpen(false);
      setSelectedUserId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Grant failed");
    } finally {
      setGranting(false);
    }
  }

  async function revokeAccess() {
    if (!revokeTarget) return;
    setRevoking(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/settings/delegations?id=${revokeTarget.id}`,
        { method: "DELETE" },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to revoke access");
      }
      setRevokeTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed");
    } finally {
      setRevoking(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-medium">Super admin controls delegation</p>
        <p className="mt-1 opacity-90">
          Grant or revoke &ldquo;Manage alert recipients&rdquo; for any active
          team member. Delegates can edit the explicit recipient list but cannot
          manage other delegations.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 dark:border-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <ShieldCheck className="h-5 w-5 text-violet-600" />
              Delegated access
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {SETTINGS_PERMISSION_LABELS["settings:notifications"]}
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} disabled={grantableUsers.length === 0}>
            <UserPlus className="h-4 w-4" />
            Grant access
          </Button>
        </div>

        {delegates.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-muted-foreground">
            No delegated access yet. Super admins always have full settings
            control.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-border">
            {delegates.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-medium">{row.userName}</p>
                  <p className="text-sm text-muted-foreground">{row.userEmail}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                        roleBadgeClass[row.userRole],
                      )}
                    >
                      {ROLE_LABELS[row.userRole]}
                    </span>
                    {!row.isActive && (
                      <Badge variant="outline" className="text-[10px]">
                        Inactive
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Granted {new Date(row.createdAt).toLocaleDateString("en-GB")}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 text-red-600 hover:text-red-700"
                    onClick={() => setRevokeTarget(row)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Revoke
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Grant recipient management</DialogTitle>
            <DialogDescription>
              Choose a team member who can edit the workspace alert recipient
              list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delegate-user">Team member</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger id="delegate-user">
                <SelectValue placeholder="Select user…" />
              </SelectTrigger>
              <SelectContent>
                {grantableUsers.map((user) => (
                  <SelectItem key={user.id} value={String(user.id)}>
                    {user.name} · {ROLE_LABELS[user.role]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!selectedUserId || granting}
              onClick={() => void grantAccess()}
            >
              {granting && <Loader2 className="h-4 w-4 animate-spin" />}
              Grant access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={`Revoke access for ${revokeTarget?.userName ?? "user"}?`}
        description="They will no longer be able to edit the workspace alert recipient list."
        confirmLabel="Revoke access"
        destructive
        loading={revoking}
        onConfirm={revokeAccess}
      />
    </div>
  );
}
