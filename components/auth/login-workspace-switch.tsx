"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { clearSessionBeforeLogin } from "@/lib/auth/sign-out-client";

type LoginWorkspaceSwitchProps = {
  targetWorkspace: string;
  currentWorkspace?: string;
};

export function LoginWorkspaceSwitch({
  targetWorkspace,
  currentWorkspace,
}: LoginWorkspaceSwitchProps) {
  const router = useRouter();
  const { status } = useSession();
  const cleanupStarted = useRef(false);

  useEffect(() => {
    if (status === "loading") return;
    if (!currentWorkspace || currentWorkspace === targetWorkspace) return;
    if (cleanupStarted.current) return;

    cleanupStarted.current = true;
    void (async () => {
      await clearSessionBeforeLogin();
      router.refresh();
    })();
  }, [currentWorkspace, targetWorkspace, status, router]);

  if (!currentWorkspace || currentWorkspace === targetWorkspace) {
    return null;
  }

  return (
    <div
      role="status"
      className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
    >
      You are signed into <span className="font-medium">{currentWorkspace}</span>.
      Sign in below to switch to{" "}
      <span className="font-medium">{targetWorkspace}</span>.
    </div>
  );
}
