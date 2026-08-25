"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { AppShell } from "@/components/layout/app-shell";
import { useNavAccess } from "@/components/providers/nav-access-provider";
import { shouldUseAppShell } from "@/lib/layout/shell-routes";

type AppShellGateProps = {
  children: React.ReactNode;
  isAuthenticated: boolean;
};

/**
 * Wraps authenticated app pages in the dashboard shell.
 * Uses server nav access + client session so the shell cannot disappear
 * when the layout prop is stale after login.
 */
export function AppShellGate({
  children,
  isAuthenticated: serverAuthenticated,
}: AppShellGateProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const navAccess = useNavAccess();
  const host =
    typeof window !== "undefined" ? window.location.host : null;

  // The live Auth.js client status is authoritative after navigation. Server
  // props and nav access are only safe during the initial loading handoff;
  // otherwise stale layout state can keep the authenticated shell mounted.
  const hasAppSession =
    status === "authenticated" ||
    (status === "loading" && (serverAuthenticated || Boolean(navAccess)));

  if (!shouldUseAppShell(pathname, host, hasAppSession)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
