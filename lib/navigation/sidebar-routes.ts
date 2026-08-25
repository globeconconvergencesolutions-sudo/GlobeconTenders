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

/** @deprecated Filters moved to the page command bar / drawer */
export function sidebarShowsFilters(_mode: SidebarMode): boolean {
  return false;
}

export function sidebarWidthClass(
  _mode: SidebarMode,
  viewport: "desktop" | "mobile",
) {
  return viewport === "desktop" ? "lg:w-64" : "w-[min(100vw-2rem,17rem)]";
}
