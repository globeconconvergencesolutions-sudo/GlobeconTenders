"use client";

import { createContext, useContext } from "react";

import type { NavAccess } from "@/lib/auth/nav-access";

const NavAccessContext = createContext<NavAccess | null>(null);

export function NavAccessProvider({
  value,
  children,
}: {
  value: NavAccess | null;
  children: React.ReactNode;
}) {
  return (
    <NavAccessContext.Provider value={value}>{children}</NavAccessContext.Provider>
  );
}

/** Server-seeded nav access — available on first paint, no client session wait. */
export function useNavAccess(): NavAccess | null {
  return useContext(NavAccessContext);
}
