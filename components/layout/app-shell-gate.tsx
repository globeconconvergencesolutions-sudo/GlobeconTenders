"use client";

import { usePathname } from "next/navigation";

import { AppShell } from "@/components/layout/app-shell";
import { shouldSkipAppShell } from "@/lib/layout/shell-routes";

type AppShellGateProps = {
  children: React.ReactNode;
  isAuthenticated: boolean;
};

/**
 * Chooses app shell using the client pathname so auth/marketing routes never
 * inherit the dashboard sidebar when x-pathname is missing on the server.
 */
export function AppShellGate({ children, isAuthenticated }: AppShellGateProps) {
  const pathname = usePathname();
  const host =
    typeof window !== "undefined" ? window.location.host : null;

  if (shouldSkipAppShell(pathname, host, isAuthenticated)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
