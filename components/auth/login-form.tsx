"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Building2,
} from "lucide-react";

import { useOrg } from "@/components/providers/org-context-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  loginWithCredentials,
  type LoginActionState,
} from "@/lib/auth/login-action";
import { WORKSPACE_LOGIN_PARAM } from "@/lib/tenant/config";
import { cn } from "@/lib/utils";

type LoginFormProps = {
  callbackUrl?: string;
  orgSlug?: string;
};

const initialState: LoginActionState = {};

export function LoginForm({
  callbackUrl = "/",
  orgSlug = "",
}: LoginFormProps) {
  const router = useRouter();
  const { branding } = useOrg();
  const [workspace, setWorkspace] = useState(orgSlug);
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, pending] = useActionState(
    loginWithCredentials,
    initialState,
  );

  useEffect(() => {
    setWorkspace(orgSlug);
  }, [orgSlug]);

  function handleWorkspaceBlur() {
    const normalized = workspace.trim().toLowerCase();
    if (!normalized || normalized === orgSlug) return;

    const url = new URL(window.location.href);
    url.searchParams.set(WORKSPACE_LOGIN_PARAM, normalized);
    router.replace(`${url.pathname}${url.search}`);
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />

      <div className="space-y-2">
        <Label htmlFor="workspace" className="text-slate-200">
          Workspace ID
        </Label>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="workspace"
            name="workspace"
            type="text"
            autoComplete="organization"
            value={workspace}
            onChange={(e) =>
              setWorkspace(e.target.value.toLowerCase().replace(/\s+/g, "-"))
            }
            onBlur={handleWorkspaceBlur}
            placeholder="your-workspace-id"
            disabled={pending}
            required
            className="h-11 border-slate-700 bg-slate-950/60 pl-10 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
          />
        </div>
        <p className="text-xs text-slate-500">
          Required. Use the ID from signup (e.g. acme). Signing into the wrong
          workspace shows that organization&apos;s data only.
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
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            disabled={pending}
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
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            disabled={pending}
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

      {state.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        disabled={pending}
        className={cn(
          "h-11 w-full bg-blue-600 text-base font-medium text-white hover:bg-blue-500",
          pending && "opacity-80",
        )}
      >
        {pending ? (
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
        Role-based access · workspace-isolated data
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
