"use client";

import { usePathname } from "next/navigation";

import { useSession } from "@/lib/auth/auth-client";
import { AppShell } from "@/components/layout/app-shell";
import { useNavAccess } from "@/components/providers/nav-access-provider";
import {
  isAuthOnlyRoute,
  shouldUseAppShell,
} from "@/lib/layout/shell-routes";

type AppShellGateProps = {
  children: React.ReactNode;
  isAuthenticated: boolean;
};

/**
 * Wraps authenticated app pages in the dashboard shell.
 * Skips client session fetch on login/signup so /api/auth is not hit there.
 */
export function AppShellGate({
  children,
  isAuthenticated: serverAuthenticated,
}: AppShellGateProps) {
  const pathname = usePathname();

  if (isAuthOnlyRoute(pathname)) {
    return <>{children}</>;
  }

  return (
    <AuthenticatedShellGate isAuthenticated={serverAuthenticated}>
      {children}
    </AuthenticatedShellGate>
  );
}

function AuthenticatedShellGate({
  children,
  isAuthenticated: serverAuthenticated,
}: AppShellGateProps) {
  const pathname = usePathname();
  const { data: session, isPending } = useSession();
  const navAccess = useNavAccess();
  const host = typeof window !== "undefined" ? window.location.host : null;

  const clientAuthenticated = Boolean(session?.session && session?.user);
  const hasAppSession =
    clientAuthenticated ||
    (isPending && (serverAuthenticated || Boolean(navAccess)));

  if (!shouldUseAppShell(pathname, host, hasAppSession)) {
    return <>{children}</>;
  }

  return <AppShell>{children}</AppShell>;
}
