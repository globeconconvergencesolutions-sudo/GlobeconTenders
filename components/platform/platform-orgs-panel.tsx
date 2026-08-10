"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  ExternalLink,
  Loader2,
  Plus,
  Settings2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PLATFORM_PRODUCT_NAME,
  PLATFORM_STAGING_HOST,
  getWorkspaceHostLabel,
} from "@/lib/tenant/config";
import { buildOrgLoginUrl } from "@/lib/platform/login-url";
import { PLAN_DEFINITIONS, type PlanId } from "@/lib/platform/plans";
import { showErrorToast, showSuccessToast } from "@/lib/toast";
import { cn } from "@/lib/utils";

type OrgRow = {
  id: number;
  name: string;
  slug: string;
  status: string;
  plan: string;
  templateId: string;
  createdAt: string;
};

type TemplateSummary = {
  id: string;
  name: string;
  description: string;
};

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "trial_expired", label: "Trial expired" },
] as const;

const statusBadgeClass: Record<string, string> = {
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  suspended: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200",
  trial_expired:
    "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
};

const planOptions = Object.values(PLAN_DEFINITIONS);

export function PlatformOrgsPanel() {
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    slug: "",
    templateId: "procurement",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const [manageTarget, setManageTarget] = useState<OrgRow | null>(null);
  const [manageForm, setManageForm] = useState<{ status: string; plan: PlanId }>({
    status: "active",
    plan: "trial",
  });
  const [manageSaving, setManageSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/orgs");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load organizations");
      setOrgs(data.organizations ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    void fetch("/api/platform/templates")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.templates)) setTemplates(data.templates);
      })
      .catch(() => undefined);
  }, [load]);

  async function createOrg() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/platform/orgs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to create organization",
        );
      }
      setDialogOpen(false);
      setForm({
        name: "",
        slug: "",
        templateId: "procurement",
        adminName: "",
        adminEmail: "",
        adminPassword: "",
      });
      showSuccessToast(`${data.organization?.name ?? "Organization"} created`);
      await load();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Create failed";
      setError(message);
      showErrorToast(message);
    } finally {
      setSaving(false);
    }
  }

  function openManage(org: OrgRow) {
    setManageTarget(org);
    setManageForm({
      status: org.status,
      plan: (org.plan in PLAN_DEFINITIONS ? org.plan : "trial") as PlanId,
    });
  }

  async function saveManage() {
    if (!manageTarget) return;
    setManageSaving(true);
    try {
      const response = await fetch(`/api/platform/orgs/${manageTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: manageForm.status,
          plan: manageForm.plan,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update organization");
      }
      showSuccessToast(`${manageTarget.name} updated`);
      setManageTarget(null);
      await load();
    } catch (err) {
      showErrorToast(err instanceof Error ? err.message : "Update failed");
    } finally {
      setManageSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Organizations</h2>
          <p className="text-sm text-muted-foreground">
            Tenants on {PLATFORM_PRODUCT_NAME}. All workspaces share{" "}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">
              {getWorkspaceHostLabel()}/login
            </code>{" "}
            and sign in with their workspace ID.
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          New organization
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wide text-muted-foreground dark:border-border dark:bg-muted/40">
            <tr>
              <th className="px-5 py-3">Organization</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Template</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((org) => (
              <tr
                key={org.id}
                className="border-b border-slate-50 last:border-0 dark:border-border/60"
              >
                <td className="px-5 py-4 font-medium">{org.name}</td>
                <td className="px-5 py-4">
                  <code className="text-xs">{org.slug}</code>
                </td>
                <td className="px-5 py-4 capitalize">
                  {PLAN_DEFINITIONS[org.plan as PlanId]?.label ?? org.plan}
                </td>
                <td className="px-5 py-4">{org.templateId}</td>
                <td className="px-5 py-4">
                  <Badge
                    variant="secondary"
                    className={cn(
                      "capitalize",
                      statusBadgeClass[org.status] ??
                        "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
                    )}
                  >
                    {org.status.replace("_", " ")}
                  </Badge>
                </td>
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      asChild
                    >
                      <a
                        href={buildOrgLoginUrl(org.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open workspace login"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => openManage(org)}
                    >
                      <Settings2 className="h-4 w-4" />
                      Manage
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {orgs.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-muted-foreground">
            No organizations yet.
          </p>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Current deployment host: {PLATFORM_STAGING_HOST}. Each org uses a workspace
        ID at login (e.g.{" "}
        <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">globecon</code>
        ).
      </p>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Create organization
            </DialogTitle>
            <DialogDescription>
              Provisions a new tenant with workspace settings and a super admin account.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="org-name">Organization name</Label>
                <Input
                  id="org-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="org-slug">Slug (subdomain)</Label>
                <Input
                  id="org-slug"
                  value={form.slug}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                    }))
                  }
                  placeholder="acme"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Template</Label>
              <Select
                value={form.templateId}
                onValueChange={(templateId) =>
                  setForm((f) => ({ ...f, templateId }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {templates.find((t) => t.id === form.templateId)?.description && (
                <p className="text-xs text-muted-foreground">
                  {templates.find((t) => t.id === form.templateId)?.description}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Super admin name</Label>
              <Input
                id="admin-name"
                value={form.adminName}
                onChange={(e) => setForm((f) => ({ ...f, adminName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Super admin email</Label>
              <Input
                id="admin-email"
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Temporary password</Label>
              <Input
                id="admin-password"
                type="password"
                value={form.adminPassword}
                onChange={(e) =>
                  setForm((f) => ({ ...f, adminPassword: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={saving} onClick={() => void createOrg()}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(manageTarget)} onOpenChange={(open) => !open && setManageTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage {manageTarget?.name}</DialogTitle>
            <DialogDescription>
              Update billing plan or suspend access without touching the database directly.
            </DialogDescription>
          </DialogHeader>
          {manageTarget && (
            <div className="grid gap-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm dark:border-border dark:bg-muted/40">
                <p className="font-medium">{manageTarget.name}</p>
                <p className="text-muted-foreground">
                  <code>{manageTarget.slug}</code> · {manageTarget.templateId}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={manageForm.status}
                  onValueChange={(status) =>
                    setManageForm((f) => ({ ...f, status }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Suspended orgs are redirected to the suspended page and blocked from API
                  access.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={manageForm.plan}
                  onValueChange={(plan) =>
                    setManageForm((f) => ({ ...f, plan: plan as PlanId }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {planOptions.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.label} — {plan.maxSeats} seats, {plan.maxSources} sources
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setManageTarget(null)}>
              Cancel
            </Button>
            <Button disabled={manageSaving} onClick={() => void saveManage()}>
              {manageSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
