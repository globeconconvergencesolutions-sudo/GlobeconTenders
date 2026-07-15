export type SidebarMode =
  | "tenders"
  | "analytics"
  | "profile"
  | "team"
  | "settings"
  | "default";

export function getSidebarMode(pathname: string): SidebarMode {
  if (pathname === "/") return "tenders";
  if (pathname.startsWith("/analytics")) return "analytics";
  if (pathname.startsWith("/profile")) return "profile";
  if (pathname.startsWith("/admin/users")) return "team";
  if (pathname.startsWith("/settings")) return "settings";
  return "default";
}

export function sidebarShowsFilters(mode: SidebarMode): boolean {
  return mode === "tenders";
}

export function sidebarWidthClass(mode: SidebarMode, viewport: "desktop" | "mobile") {
  if (mode === "tenders") {
    return viewport === "desktop" ? "lg:w-80" : "w-[min(100vw-2rem,20rem)]";
  }
  return viewport === "desktop" ? "lg:w-64" : "w-[min(100vw-2rem,17rem)]";
}
