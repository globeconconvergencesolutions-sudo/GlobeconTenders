"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Building2,
} from "lucide-react";

import { useLexicon, useOrg } from "@/components/providers/org-context-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  clearSessionBeforeLogin,
  waitForLoginSession,
} from "@/lib/auth/sign-out-client";
import { DEFAULT_ORG_SLUG } from "@/lib/tenant/config";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  callbackUrl?: string;
  orgSlug?: string;
};

export function LoginForm({
  callbackUrl = "/",
  orgSlug = DEFAULT_ORG_SLUG,
}: LoginFormProps) {
  const { branding } = useOrg();
  const { t } = useLexicon();
  const [workspace, setWorkspace] = useState(orgSlug);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setWorkspace(orgSlug);
  }, [orgSlug]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    const targetWorkspace = workspace.trim().toLowerCase() || DEFAULT_ORG_SLUG;

    try {
      await clearSessionBeforeLogin();

      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        orgSlug: targetWorkspace,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      if (!result?.ok) {
        setError("Unable to sign in right now. Please try again.");
        return;
      }

      const sessionReady = await waitForLoginSession(targetWorkspace);
      if (!sessionReady) {
        setError(
          "Sign-in succeeded but the workspace did not switch. Sign out and try again.",
        );
        return;
      }

      window.location.assign(callbackUrl);
    } catch {
      setError("Something went wrong. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="workspace" className="text-slate-200">
          Workspace ID
        </Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="workspace"
            type="text"
            autoComplete="organization"
            value={workspace}
            onChange={(e) =>
              setWorkspace(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            placeholder="globecon"
            disabled={loading}
            required
            className="h-11 border-slate-700 bg-slate-950/60 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
          />
        </div>
        <p className="text-xs text-slate-500">
          The ID you chose at signup (e.g. globecon, acme).
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-200">
          Work email
        </Label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@globecon.com"
            disabled={loading}
            required
            className="h-11 border-slate-700 bg-slate-950/60 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="password" className="text-slate-200">
            Password
          </Label>
          <Link
            href="/login/forgot-password"
            className="text-xs text-slate-400 transition-colors hover:text-slate-200"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            disabled={loading}
            required
            minLength={6}
            className="h-11 border-slate-700 bg-slate-950/60 pl-10 pr-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition-colors hover:text-slate-300"
            aria-label={showPassword ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <Button
        type="submit"
        disabled={loading}
        className={cn(
          "h-11 w-full bg-blue-600 text-base font-medium text-white hover:bg-blue-500",
          loading && "opacity-80",
        )}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          `Sign in to ${branding.productTagline}`
        )}
      </Button>

      <p className="flex items-center justify-center gap-2 text-center text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5" />
        Role-based access · {branding.displayName} team only
      </p>

      <p className="mt-4 text-center text-xs text-slate-500">
        New organization?{" "}
        <Link href="/signup" className="text-slate-300 hover:text-white">
          Start a free trial
        </Link>
      </p>
    </form>
  );
}
