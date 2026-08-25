"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type DragEvent,
} from "react";
import {
  CheckCircle2,
  ImagePlus,
  Loader2,
  Palette,
  Trash2,
  Upload,
} from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { SettingsPageHeader } from "@/components/settings/settings-page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkspaceBrandingSettings } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

type BrandingPayload = {
  branding: WorkspaceBrandingSettings;
  resolved: {
    displayName: string;
    productTagline: string;
    primaryColor: string;
    accentColor: string;
    logoUrl: string | null;
    coverUrl: string | null;
  };
  organizationName: string;
};

type UploadKind = "logo" | "cover";

function ImageDropZone({
  kind,
  label,
  hint,
  previewUrl,
  uploading,
  onFile,
  onRemove,
  aspectClass,
}: {
  kind: UploadKind;
  label: string;
  hint: string;
  previewUrl: string | null;
  uploading: boolean;
  onFile: (file: File) => void;
  onRemove: () => void;
  aspectClass: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function acceptFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFile(file);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    acceptFiles(event.dataTransfer.files);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        {previewUrl && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={onRemove}
            className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </Button>
        )}
      </div>

      <label
        htmlFor={inputId}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed transition-all",
          aspectClass,
          dragging
            ? "border-blue-400 bg-blue-50/80 dark:border-blue-500 dark:bg-blue-950/40"
            : "border-slate-200 bg-slate-50 hover:border-blue-300 hover:bg-blue-50/40 dark:border-border dark:bg-muted/20 dark:hover:border-blue-500/50",
          uploading && "pointer-events-none opacity-70",
        )}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={`${label} preview`}
            className={cn(
              "h-full w-full",
              kind === "logo" ? "object-contain p-6" : "object-cover",
            )}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm dark:bg-card">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
              ) : (
                <ImagePlus className="h-5 w-5 text-slate-400" />
              )}
            </span>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {uploading ? "Uploading…" : "Drop image or click to upload"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              PNG, JPG, WebP, or SVG · max 4MB
            </p>
          </div>
        )}
        {previewUrl && uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 dark:bg-black/50">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        )}
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            acceptFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </label>
    </div>
  );
}

export function BrandingSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({
    displayName: "",
    primaryColor: "#2563eb",
    accentColor: "#1d4ed8",
    logoUrl: "",
    coverUrl: "",
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
        coverUrl: payload.branding.coverUrl ?? "",
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

  async function uploadImage(kind: UploadKind, file: File) {
    setUploading(kind);
    setError(null);
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch("/api/settings/branding/upload", {
        method: "POST",
        body,
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Upload failed");
      }
      setForm((prev) => ({
        ...prev,
        logoUrl: payload.branding.logoUrl ?? prev.logoUrl,
        coverUrl: payload.branding.coverUrl ?? prev.coverUrl,
        displayName: payload.branding.displayName ?? prev.displayName,
        primaryColor: payload.branding.primaryColor ?? prev.primaryColor,
        accentColor: payload.branding.accentColor ?? prev.accentColor,
      }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function removeImage(kind: UploadKind) {
    setUploading(kind);
    setError(null);
    try {
      const response = await fetch("/api/settings/branding/upload", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Remove failed");
      }
      setForm((prev) => ({
        ...prev,
        ...(kind === "logo" ? { logoUrl: "" } : { coverUrl: "" }),
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setUploading(null);
    }
  }

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
          ...(showAdvanced
            ? {
                logoUrl: form.logoUrl.trim(),
                coverUrl: form.coverUrl.trim(),
              }
            : {}),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Failed to save branding",
        );
      }
      setForm({
        displayName:
          payload.branding.displayName ?? form.displayName,
        primaryColor: payload.branding.primaryColor ?? form.primaryColor,
        accentColor: payload.branding.accentColor ?? form.accentColor,
        logoUrl: payload.branding.logoUrl ?? "",
        coverUrl: payload.branding.coverUrl ?? "",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const previewBranding = {
    displayName: form.displayName || "Your organization",
    productTagline: "Preview",
    primaryColor: form.primaryColor,
    accentColor: form.accentColor,
    logoUrl: form.logoUrl.trim() || null,
    coverUrl: form.coverUrl.trim() || null,
    fallbackLogoUrl: "/brand/logo-sidebar.png",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
          <div className="h-64 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <SettingsPageHeader
        icon={Palette}
        title="Branding studio"
        description="Logo, login cover, and colors — live preview of how your workspace appears."
        tone="sky"
      />

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card sm:p-6">
            <div className="mb-5 space-y-2">
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
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card sm:p-6">
            <ImageDropZone
              kind="logo"
              label="Workspace logo"
              hint="Shown in the sidebar, emails, and login mark"
              previewUrl={form.logoUrl.trim() || null}
              uploading={uploading === "logo"}
              onFile={(file) => void uploadImage("logo", file)}
              onRemove={() => void removeImage("logo")}
              aspectClass="aspect-square max-h-56"
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card sm:p-6">
            <ImageDropZone
              kind="cover"
              label="Login cover"
              hint="Wide image for the sign-in hero panel"
              previewUrl={form.coverUrl.trim() || null}
              uploading={uploading === "cover"}
              onFile={(file) => void uploadImage("cover", file)}
              onRemove={() => void removeImage("cover")}
              aspectClass="aspect-[16/9] min-h-[10rem]"
            />
          </section>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="text-xs font-semibold text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline dark:hover:text-slate-200"
            >
              {showAdvanced ? "Hide" : "Show"} advanced URL fields
            </button>
            {showAdvanced && (
              <div className="mt-4 space-y-4 rounded-2xl border border-dashed border-slate-200 p-4 dark:border-border">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    type="url"
                    value={form.logoUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, logoUrl: e.target.value }))
                    }
                    placeholder="https://…"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverUrl">Cover URL</Label>
                  <Input
                    id="coverUrl"
                    type="url"
                    value={form.coverUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, coverUrl: e.target.value }))
                    }
                    placeholder="https://…"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6 xl:self-start">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
            Live previews
          </p>

          {/* Sidebar preview */}
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-lg">
            <div className="border-b border-white/10 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Sidebar
              </p>
            </div>
            <div className="p-4">
              <AppLogo size="md" brandingOverride={previewBranding} />
            </div>
          </div>

          {/* Login hero preview */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-800 shadow-lg">
            <div
              className="absolute inset-0 bg-gradient-to-br from-slate-950 via-[#0b1530] to-slate-900"
              style={
                form.coverUrl
                  ? {
                      backgroundImage: `linear-gradient(to bottom right, rgba(2,6,23,0.75), rgba(2,6,23,0.9)), url(${form.coverUrl})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                    }
                  : undefined
              }
            />
            <div className="relative space-y-4 p-5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Login hero
              </p>
              <AppLogo
                size="sm"
                variant="login"
                brandingOverride={previewBranding}
              />
              <p className="text-lg font-semibold leading-snug text-white">
                {previewBranding.productTagline} for{" "}
                {previewBranding.displayName}
              </p>
            </div>
          </div>

          {/* Email-ish header */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{ backgroundColor: form.primaryColor }}
            >
              {form.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.logoUrl}
                  alt=""
                  className="h-8 w-8 rounded-lg bg-white/20 object-contain p-0.5"
                />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-sm font-bold text-white">
                  {(form.displayName || "W").charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <p className="text-sm font-semibold text-white">
                  {form.displayName || "Your organization"}
                </p>
                <p className="text-[10px] text-white/70">Alert digest preview</p>
              </div>
            </div>
            <div className="px-4 py-3 text-xs text-muted-foreground">
              Email headers use your primary color and logo.
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4 dark:border-border">
        <Button type="submit" disabled={saving || uploading !== null}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" />
              Save branding
            </>
          )}
        </Button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Saved
          </span>
        )}
      </div>
    </form>
  );
}
