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

  const clientAuthenticated = Boolean(session?.user?.id);
  const hasAppSession =
    Boolean(navAccess) ||
    serverAuthenticated ||
    clientAuthenticated ||
    (status === "loading" && serverAuthenticated);

  if (!shouldUseAppShell(pathname, host, hasAppSession)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
