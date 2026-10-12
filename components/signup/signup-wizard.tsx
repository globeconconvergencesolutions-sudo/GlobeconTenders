"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Loader2,
  Sparkles,
} from "lucide-react";

import { LoginHero } from "@/components/auth/login-hero";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiErrorAlert } from "@/components/ui/api-error-alert";
import { readApiError, type ParsedClientError } from "@/lib/api/client-error";
import {
  getWorkspaceHostLabel,
  PLATFORM_PRODUCT_NAME,
  WORKSPACE_LOGIN_PARAM,
} from "@/lib/tenant/config";
import { cn } from "@/lib/utils";

type TemplateSummary = {
  id: string;
  name: string;
  description: string;
};

type SignupForm = {
  name: string;
  slug: string;
  templateId: string;
  adminName: string;
  adminEmail: string;
  adminPassword: string;
};

const STEPS = ["Organization", "Template", "Account", "Confirm"] as const;

function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function SignupWizard() {
  const [step, setStep] = useState(0);
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ParsedClientError | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [form, setForm] = useState<SignupForm>({
    name: "",
    slug: "",
    templateId: "procurement",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  useEffect(() => {
    void fetch("/api/signup")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(
            typeof data.error === "string" ? data.error : "Failed to load templates",
          );
        }
        if (Array.isArray(data.templates)) {
          setTemplates(data.templates);
          if (data.templates[0]?.id) {
            setForm((current) => ({
              ...current,
              templateId: current.templateId || data.templates[0].id,
            }));
          }
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error
            ? { message: err.message }
            : { message: "Failed to load signup" },
        );
      })
      .finally(() => setLoadingTemplates(false));
  }, []);

  const workspaceHostLabel = getWorkspaceHostLabel();

  const selectedTemplate = templates.find((t) => t.id === form.templateId);

  const canContinue = useMemo(() => {
    if (step === 0) return form.name.trim().length >= 2 && form.slug.trim().length >= 2;
    if (step === 1) return Boolean(form.templateId);
    if (step === 2) {
      return (
        form.adminName.trim().length >= 2 &&
        form.adminEmail.includes("@") &&
        form.adminPassword.length >= 8
      );
    }
    return true;
  }, [form, step]);

  const submitSignup = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const parsed = await readApiError(response, "Signup failed");
        setError(parsed);
        return;
      }
      const data = await response.json();
      setLoginUrl(data.loginUrl ?? null);
      setStep(3);
    } catch {
      setError({ message: "Signup failed — check your connection and try again" });
    } finally {
      setSubmitting(false);
    }
  }, [form]);

  if (loadingTemplates) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh w-full overflow-y-auto bg-slate-950">
      <LoginHero />

      <div className="flex w-full flex-1 flex-col justify-center px-6 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] sm:px-10 lg:px-16 xl:px-24">
        <div className="mx-auto w-full max-w-lg">
          <div className="mb-8 lg:hidden">
            <AppLogo size="md" variant="login" />
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 backdrop-blur-sm sm:p-8">
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-400">
                {PLATFORM_PRODUCT_NAME}
              </p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Start your workspace
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                14-day free trial · No credit card required
              </p>
            </div>

            <ol className="mb-8 flex gap-2">
              {STEPS.map((label, index) => (
                <li
                  key={label}
                  className={cn(
                    "flex-1 rounded-lg border px-2 py-2 text-center text-[11px] font-medium",
                    index === step
                      ? "border-blue-500/50 bg-blue-500/10 text-blue-200"
                      : index < step
                        ? "border-slate-700 text-slate-400"
                        : "border-slate-800 text-slate-600",
                  )}
                >
                  {label}
                </li>
              ))}
            </ol>

            {error && <ApiErrorAlert error={error} className="mb-4" />}

            {step === 0 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name" className="text-slate-200">
                    Organization name
                  </Label>
                  <Input
                    id="org-name"
                    value={form.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      setForm((current) => ({
                        ...current,
                        name,
                        slug: current.slug || slugifyName(name),
                      }));
                    }}
                    className="border-slate-700 bg-slate-950/60 text-white"
                    placeholder="Acme Procurement"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug" className="text-slate-200">
                    Workspace ID
                  </Label>
                  <Input
                    id="org-slug"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                      }))
                    }
                    className="border-slate-700 bg-slate-950/60 text-white"
                    placeholder="acme"
                  />
                  <p className="text-xs text-slate-500">
                    Your team signs in at{" "}
                    <code className="text-slate-400">{workspaceHostLabel}/login</code>{" "}
                    with workspace ID{" "}
                    <code className="text-slate-400">{form.slug || "acme"}</code>
                  </p>
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-3">
                {templates.map((template) => {
                  const selected = form.templateId === template.id;
                  return (
                    <button
                      key={template.id}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({ ...current, templateId: template.id }))
                      }
                      className={cn(
                        "rounded-xl border p-4 text-left transition-colors",
                        selected
                          ? "border-blue-500/60 bg-blue-500/10"
                          : "border-slate-700 bg-slate-950/40 hover:border-slate-600",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-400" />
                        <span className="font-medium text-white">{template.name}</span>
                      </div>
                      <p className="mt-2 text-sm text-slate-400">{template.description}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-name" className="text-slate-200">
                    Your name
                  </Label>
                  <Input
                    id="admin-name"
                    value={form.adminName}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, adminName: e.target.value }))
                    }
                    className="border-slate-700 bg-slate-950/60 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-email" className="text-slate-200">
                    Work email
                  </Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) =>
                      setForm((current) => ({ ...current, adminEmail: e.target.value }))
                    }
                    className="border-slate-700 bg-slate-950/60 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-password" className="text-slate-200">
                    Password
                  </Label>
                  <Input
                    id="admin-password"
                    type="password"
                    minLength={8}
                    value={form.adminPassword}
                    onChange={(e) =>
                      setForm((current) => ({
                        ...current,
                        adminPassword: e.target.value,
                      }))
                    }
                    className="border-slate-700 bg-slate-950/60 text-white"
                  />
                  <p className="text-xs text-slate-500">Minimum 8 characters</p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Workspace ready</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    <span className="font-medium text-slate-200">{form.name}</span> was
                    created with the{" "}
                    <span className="font-medium text-slate-200">
                      {selectedTemplate?.name ?? form.templateId}
                    </span>{" "}
                    template.
                  </p>
                </div>
                {loginUrl ? (
                  <Button asChild className="w-full bg-blue-600 hover:bg-blue-500">
                    <a href={loginUrl}>
                      <Sparkles className="h-4 w-4" />
                      Go to your workspace
                    </a>
                  </Button>
                ) : (
                  <p className="text-sm text-slate-400">
                    Sign in at{" "}
                    <code className="text-slate-300">
                      {workspaceHostLabel}/login?{WORKSPACE_LOGIN_PARAM}={form.slug}
                    </code>
                  </p>
                )}
              </div>
            )}

            {step < 3 && (
              <div className="mt-8 flex items-center justify-between gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-slate-400 hover:text-white"
                  disabled={step === 0 || submitting}
                  onClick={() => setStep((current) => Math.max(0, current - 1))}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>

                {step < 2 ? (
                  <Button
                    type="button"
                    disabled={!canContinue}
                    onClick={() => setStep((current) => current + 1)}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={!canContinue || submitting}
                    onClick={() => void submitSignup()}
                    className="bg-blue-600 hover:bg-blue-500"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create workspace"
                    )}
                  </Button>
                )}
              </div>
            )}

            <p className="mt-6 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <Link href="/login" className="text-slate-300 hover:text-white">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
