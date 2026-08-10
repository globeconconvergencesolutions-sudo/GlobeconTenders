"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Palette } from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkspaceBrandingSettings } from "@/lib/db/schema";

type BrandingPayload = {
  branding: WorkspaceBrandingSettings;
  resolved: {
    displayName: string;
    productTagline: string;
    primaryColor: string;
    accentColor: string;
    logoUrl: string | null;
  };
  organizationName: string;
};

export function BrandingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    primaryColor: "#2563eb",
    accentColor: "#1d4ed8",
    logoUrl: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/settings/branding");
      const payload = (await response.json()) as BrandingPayload & {
        error?: string;
      };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load branding");
      }
      setForm({
        displayName:
          payload.branding.displayName ?? payload.organizationName ?? "",
        primaryColor: payload.branding.primaryColor ?? "#2563eb",
        accentColor: payload.branding.accentColor ?? "#1d4ed8",
        logoUrl: payload.branding.logoUrl ?? "",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load branding");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const response = await fetch("/api/settings/branding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: form.displayName.trim(),
          primaryColor: form.primaryColor,
          accentColor: form.accentColor,
          logoUrl: form.logoUrl.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to save branding");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading branding settings…
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="mx-auto max-w-2xl space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-border dark:bg-card">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Organization branding</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Customize how your workspace appears in the sidebar, login page,
              and alert emails.
            </p>
          </div>
        </div>

        <div className="mb-8 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 dark:border-border dark:bg-muted/30">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Preview
          </p>
          <AppLogo
            size="md"
            brandingOverride={{
              displayName: form.displayName || "Your organization",
              productTagline: "Preview",
              primaryColor: form.primaryColor,
              accentColor: form.accentColor,
              logoUrl: form.logoUrl.trim() || null,
              fallbackLogoUrl: "/brand/logo-sidebar.png",
            }}
          />
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display name</Label>
            <Input
              id="displayName"
              value={form.displayName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, displayName: e.target.value }))
              }
              placeholder="Globecon"
              required
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary color</Label>
              <div className="flex gap-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={form.primaryColor}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      primaryColor: e.target.value,
                    }))
                  }
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={form.primaryColor}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      primaryColor: e.target.value,
                    }))
                  }
                  pattern="^#[0-9a-fA-F]{6}$"
                  placeholder="#2563eb"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accentColor">Accent color</Label>
              <div className="flex gap-2">
                <Input
                  id="accentColor"
                  type="color"
                  value={form.accentColor}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      accentColor: e.target.value,
                    }))
                  }
                  className="h-10 w-14 cursor-pointer p-1"
                />
                <Input
                  value={form.accentColor}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      accentColor: e.target.value,
                    }))
                  }
                  pattern="^#[0-9a-fA-F]{6}$"
                  placeholder="#1d4ed8"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL (optional)</Label>
            <Input
              id="logoUrl"
              type="url"
              value={form.logoUrl}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, logoUrl: e.target.value }))
              }
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-muted-foreground">
              Use a square PNG or SVG hosted on a public URL. Leave blank to use
              the default mark.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save branding"
          )}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Saved — refreshing…
          </span>
        )}
      </div>
    </form>
  );
}
