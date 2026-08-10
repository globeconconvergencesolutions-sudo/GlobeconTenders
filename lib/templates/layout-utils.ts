import type { WorkspaceLayoutSettings } from "@/lib/db/schema";

export function layoutShowsSection(
  layout: WorkspaceLayoutSettings,
  section: WorkspaceLayoutSettings["sidebarSections"][number],
): boolean {
  if (layout.sidebarSections.includes(section)) return true;
  if (section === "serviceLines" && layout.sidebarSections.includes("departments")) {
    return true;
  }
  if (section === "departments" && layout.sidebarSections.includes("serviceLines")) {
    return true;
  }
  return false;
}
