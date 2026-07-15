"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  Loader2,
  Mail,
  Search,
  Shield,
  UserCheck,
  UserX,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { AlertRecipientRow } from "@/lib/settings/recipients";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const roleBadgeClass: Record<UserRole, string> = {
  super_admin:
    "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  analyst:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  viewer: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

type NotificationsPayload = {
  notifications: {
    enabled: boolean;
    includedUserIds: number[];
    respectUserOptOut: boolean;
  };
  recipients: AlertRecipientRow[];
  workspaceEnabled: boolean;
  includedCount: number;
};

export function NotificationsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [query, setQuery] = useState("");
  const [data, setData] = useState<NotificationsPayload | null>(null);
  const [includedIds, setIncludedIds] = useState<number[]>([]);
  const [workspaceEnabled, setWorkspaceEnabled] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/notifications");
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load notification settings");
      }
      setData(payload);
      setIncludedIds(payload.notifications.includedUserIds ?? []);
      setWorkspaceEnabled(payload.notifications.enabled !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRecipients = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.recipients;
    return data.recipients.filter(
      (row) =>
        row.name.toLowerCase().includes(q) ||
        row.email.toLowerCase().includes(q) ||
        ROLE_LABELS[row.role].toLowerCase().includes(q),
    );
  }, [data, query]);

  async function savePatch(patch: {
    enabled?: boolean;
    includedUserIds?: number[];
  }) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to save settings",
        );
      }
      setIncludedIds(payload.notifications.includedUserIds);
      setWorkspaceEnabled(payload.notifications.enabled !== false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function toggleIncluded(userId: number, included: boolean) {
    const next = included
      ? [...new Set([...includedIds, userId])]
      : includedIds.filter((id) => id !== userId);
    setIncludedIds(next);
    void savePatch({ includedUserIds: next });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const activeIncluded = includedIds.length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Shield className="h-4 w-4" />
            Delivery policy
          </div>
          <p className="mt-2 text-lg font-semibold">Explicit list only</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Only people you include below receive workspace digests.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <UserCheck className="h-4 w-4" />
            Included recipients
          </div>
          <p className="mt-2 text-lg font-semibold">{activeIncluded}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Active team members on the alert list.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Bell className="h-4 w-4" />
            Workspace alerts
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">
              {workspaceEnabled ? "Enabled" : "Paused"}
            </p>
            <Switch
              checked={workspaceEnabled}
              disabled={saving}
              onCheckedChange={(checked) => {
                setWorkspaceEnabled(checked);
                void savePatch({ enabled: checked });
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Master switch for all outbound digests.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
        <p className="font-medium">Personal opt-out still applies</p>
        <p className="mt-1 opacity-90">
          Included users can turn alerts off on their Profile. Delivery requires
          workspace inclusion, workspace alerts enabled, and their personal
          alert switch on.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 dark:border-border sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Mail className="h-5 w-5 text-blue-600" />
              Alert recipients
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose who receives tender digests from this workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Saved
              </span>
            )}
            {saving && (
              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </span>
            )}
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search team…"
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-muted-foreground dark:border-border">
                <th className="px-5 py-3 font-medium">Team member</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Org list</th>
                <th className="px-5 py-3 font-medium">Personal alerts</th>
                <th className="px-5 py-3 font-medium">Receives digests</th>
                <th className="px-5 py-3 font-medium">Last digest</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecipients.map((row) => {
                const included = includedIds.includes(row.id);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 last:border-0 dark:border-border/60"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {row.email}
                      </div>
                      {!row.isActive && (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-medium",
                          roleBadgeClass[row.role],
                        )}
                      >
                        {ROLE_LABELS[row.role]}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <Switch
                        checked={included}
                        disabled={!row.isActive || saving}
                        onCheckedChange={(checked) =>
                          toggleIncluded(row.id, checked)
                        }
                        aria-label={`Include ${row.name} in alerts`}
                      />
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium",
                          row.personalAlertsEnabled
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-slate-500",
                        )}
                      >
                        {row.personalAlertsEnabled ? (
                          <Bell className="h-3.5 w-3.5" />
                        ) : (
                          <BellOff className="h-3.5 w-3.5" />
                        )}
                        {row.personalAlertsEnabled ? "On" : "Off"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {row.receivesAlerts ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          <UserCheck className="h-3.5 w-3.5" />
                          Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          <UserX className="h-3.5 w-3.5" />
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">
                      {row.lastDigest ? (
                        <div>
                          <p className="font-medium capitalize text-foreground">
                            {row.lastDigest.status}
                          </p>
                          <p>
                            {new Date(row.lastDigest.sentAt).toLocaleString(
                              "en-GB",
                            )}
                          </p>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredRecipients.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No team members match your search.
          </div>
        )}
      </div>
    </div>
  );
}
