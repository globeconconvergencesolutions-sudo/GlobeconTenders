"use client";

/**
 * Better Auth client session is read via useSession in AppShellGate.
 * Provider is a no-op wrapper so layout stays stable without next-auth.
 */
export function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
  session?: unknown;
}) {
  return <>{children}</>;
}
