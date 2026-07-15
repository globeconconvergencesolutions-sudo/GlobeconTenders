"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell,
  CheckCircle2,
  Loader2,
  Mail,
  Send,
  Sparkles,
  Timer,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import type { NotificationPrefs } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type DigestLogRow = {
  id: number;
  status: string;
  closingCount: number;
  highMatchCount: number;
  errorMessage: string | null;
  sentAt: string;
};

type NotificationSettingsProps = {
  userName: string;
  userEmail: string;
};

export function NotificationSettings({
  userName,
  userEmail,
}: NotificationSettingsProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testFailed, setTestFailed] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [smtpConfigured, setSmtpConfigured] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [emailConnected, setEmailConnected] = useState(false);
  const [emailFrom, setEmailFrom] = useState<string | null>(null);
  const [emailFromName, setEmailFromName] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [recentDigests, setRecentDigests] = useState<DigestLogRow[]>([]);
  const [orgIncluded, setOrgIncluded] = useState(true);
  const [workspaceAlertsEnabled, setWorkspaceAlertsEnabled] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPrefs>({
    enabled: true,
    closingSoon: true,
    closingSoonDays: 3,
    highMatch: true,
    highMatchThreshold: 30,
    afterSync: true,
  });

  const loadPrefs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/notifications");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load notification settings");
      }
      setPrefs(data.prefs);
      setEmailConfigured(Boolean(data.emailConfigured));
      setSmtpConfigured(Boolean(data.smtpConfigured ?? data.emailConfigured));
      setAlertsEnabled(data.alertsEnabled !== false);
      setEmailConnected(Boolean(data.emailConnected));
      setEmailFrom(data.emailFrom ?? null);
      setEmailFromName(data.emailFromName ?? null);
      setEmailError(data.emailError ?? null);
      setRecentDigests(data.recentDigests ?? []);
      setOrgIncluded(data.orgIncluded !== false);
      setWorkspaceAlertsEnabled(data.workspaceAlertsEnabled !== false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrefs();
  }, [loadPrefs]);

  async function savePrefs(next: NotificationPrefs) {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save preferences");
      }
      setPrefs(data.prefs);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function updatePref<K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K],
  ) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    void savePrefs(next);
  }

  async function sendTestEmail() {
    setTesting(true);
    setTestMessage(null);
    setTestFailed(false);
    setError(null);
    try {
      const response = await fetch("/api/alerts/test", { method: "POST" });
      const data = await response.json();
      if (!response.ok) {
        setTestFailed(true);
        throw new Error(data.error ?? "Test email failed");
      }
      setTestMessage(
        data.message ??
          `Test email sent to ${data.to ?? userEmail}`,
      );
      void loadPrefs();
    } catch (err) {
      setTestFailed(true);
      setError(err instanceof Error ? err.message : "Test email failed");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "rounded-xl border px-4 py-3 text-sm",
          !smtpConfigured
            ? "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"
            : emailConnected
              ? alertsEnabled
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200"
                : "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-100",
        )}
      >
        {!smtpConfigured ? (
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Gmail not configured yet</p>
              <p className="mt-1 opacity-90">
                Add <code className="rounded bg-white/60 px-1">GMAIL_USER</code>{" "}
                and{" "}
                <code className="rounded bg-white/60 px-1">
                  GMAIL_APP_PASSWORD
                </code>{" "}
                (Google App Password) to{" "}
                <code className="rounded bg-white/60 px-1">.env.local</code>,
                then restart the dev server. Team invites and password resets
                also need this.
              </p>
            </div>
          </div>
        ) : emailConnected ? (
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Gmail connected via app password</p>
              <p className="mt-1 opacity-90">
                Sending from{" "}
                <strong>{emailFromName ?? "Globecon Tender Watch"}</strong>
                {emailFrom ? <> ({emailFrom})</> : null}.
                {alertsEnabled ? (
                  <>
                    {" "}
                    Tender digests go to <strong>{userEmail}</strong> when
                    opportunities match your filters.
                  </>
                ) : (
                  <>
                    {" "}
                    Tender digests are paused (
                    <code className="rounded bg-white/60 px-1">
                      EMAIL_ALERTS_ENABLED=false
                    </code>
                    ). Team invites and password resets still send.
                  </>
                )}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-medium">Gmail credentials found but not connected</p>
              <p className="mt-1 opacity-90">
                {emailError ??
                  "Could not reach Gmail SMTP. Check your app password and network."}
              </p>
            </div>
          </div>
        )}
      </div>

      {!orgIncluded && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-medium">You are not on the workspace alert list</p>
          <p className="mt-1 opacity-90">
            Your organization uses an explicit recipient list. A workspace admin
            must include you under Settings → Notifications before digests can
            be delivered, even if your personal alerts are on.
          </p>
        </div>
      )}

      {orgIncluded && !workspaceAlertsEnabled && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
          <p className="font-medium">Workspace alerts are paused</p>
          <p className="mt-1 opacity-90">
            You are on the recipient list, but workspace-wide digests are
            currently disabled by an administrator.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {testMessage && (
        <div
          className={cn(
            "rounded-xl border px-4 py-3 text-sm",
            testFailed
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200",
          )}
        >
          {testMessage}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card sm:p-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Bell className="h-5 w-5 text-blue-600" />
              Email alerts
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Personalized digests for {userName} based on sidebar filters.
            </p>
          </div>
          {saved && (
            <span className="text-xs font-medium text-emerald-600">
              Saved
            </span>
          )}
        </div>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-100 px-4 py-3 dark:border-border">
            <div>
              <Label htmlFor="alerts-enabled">Enable email alerts</Label>
              <p className="text-xs text-muted-foreground">
                Master switch for all tender notifications
              </p>
            </div>
            <Switch
              id="alerts-enabled"
              checked={prefs.enabled}
              disabled={saving}
              onCheckedChange={(checked) => updatePref("enabled", checked)}
            />
          </div>

          <div
            className={cn(
              "space-y-4 rounded-lg border border-slate-100 p-4 dark:border-border",
              !prefs.enabled && "opacity-50",
            )}
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Timer className="mt-0.5 h-4 w-4 text-amber-600" />
                <div>
                  <Label htmlFor="closing-soon">Closing soon alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when filtered tenders are nearing deadline
                  </p>
                </div>
              </div>
              <Switch
                id="closing-soon"
                checked={prefs.closingSoon}
                disabled={!prefs.enabled || saving}
                onCheckedChange={(checked) =>
                  updatePref("closingSoon", checked)
                }
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
              <Label htmlFor="closing-days">Days before close</Label>
              <Select
                value={String(prefs.closingSoonDays)}
                disabled={!prefs.enabled || !prefs.closingSoon || saving}
                onValueChange={(value) =>
                  updatePref("closingSoonDays", Number(value))
                }
              >
                <SelectTrigger id="closing-days">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 7, 10, 14].map((days) => (
                    <SelectItem key={days} value={String(days)}>
                      {days} day{days === 1 ? "" : "s"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-border">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 text-emerald-600" />
                <div>
                  <Label htmlFor="high-match">High match alerts</Label>
                  <p className="text-xs text-muted-foreground">
                    Notify when tenders score strongly on Globecon service lines
                  </p>
                </div>
              </div>
              <Switch
                id="high-match"
                checked={prefs.highMatch}
                disabled={!prefs.enabled || saving}
                onCheckedChange={(checked) => updatePref("highMatch", checked)}
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-[140px_1fr] sm:items-center">
              <Label htmlFor="match-threshold">Minimum score</Label>
              <Input
                id="match-threshold"
                type="number"
                min={10}
                max={100}
                step={10}
                value={prefs.highMatchThreshold}
                disabled={!prefs.enabled || !prefs.highMatch || saving}
                onChange={(e) =>
                  updatePref(
                    "highMatchThreshold",
                    Math.min(100, Math.max(10, Number(e.target.value) || 30)),
                  )
                }
              />
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 dark:border-border">
              <div>
                <Label htmlFor="after-sync">Send after sync</Label>
                <p className="text-xs text-muted-foreground">
                  Immediate digest when new high-match tenders arrive from sync
                </p>
              </div>
              <Switch
                id="after-sync"
                checked={prefs.afterSync}
                disabled={!prefs.enabled || saving}
                onCheckedChange={(checked) => updatePref("afterSync", checked)}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={!emailConfigured || !alertsEnabled || !emailConnected || testing}
            onClick={sendTestEmail}
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send test email
          </Button>
          {saving && (
            <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card sm:p-6">
        <h3 className="mb-1 text-base font-semibold">Recent email activity</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Automatic digests after sync and scheduled cron runs appear here.
        </p>
        {recentDigests.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-muted-foreground dark:border-border">
            No digests logged yet. Run a sync with matching tenders or use Send
            test email above.
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-border">
            {recentDigests.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                        row.status === "success" &&
                          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
                        row.status === "failed" &&
                          "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
                        row.status === "skipped" &&
                          "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300",
                      )}
                    >
                      {row.status}
                    </span>
                    {row.status === "success" ? "Email sent" : row.status}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(row.sentAt).toLocaleString("en-GB")}
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <p>
                    {row.closingCount} closing · {row.highMatchCount} high match
                  </p>
                  {row.errorMessage && (
                    <p className="mt-1 max-w-xs text-red-600">{row.errorMessage}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
