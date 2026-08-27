import type { UserRole } from "@/lib/db/schema";
import { ROLE_LABELS, ROLES } from "@/lib/auth/permissions";

export type RolePageAccess = {
  label: string;
  href: string;
  note?: string;
};

export type RoleGuide = {
  role: UserRole;
  label: string;
  tagline: string;
  summary: string;
  /** Pages / areas this role can open */
  pages: RolePageAccess[];
  /** Explicitly out of scope */
  cannot: string[];
  /** Concrete capabilities */
  can: string[];
};

export const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  super_admin:
    "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  admin: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  analyst:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  viewer: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

/**
 * Canonical product scopes — keep UI, nav, middleware, and APIs aligned.
 *
 * Super Admin — workspace owner: identity, plan, settings, every team role
 * Admin       — operations: Team + catalog lifecycle + pipeline. No branding/plan
 *               unless a Super Admin delegates alert-recipient settings.
 * Analyst     — pipeline: add catalog, sync, save/export/share. No archive/Team/settings
 * Viewer      — browse tenders + analytics + profile. No pipeline mutations
 */
export const ROLE_GUIDES: Record<UserRole, RoleGuide> = {
  super_admin: {
    role: "super_admin",
    label: ROLE_LABELS.super_admin,
    tagline: "Workspace owner",
    summary:
      "Full control of this workspace — branding, terminology, plan, alerts policy, and every team role.",
    pages: [
      { label: "Tenders / pipeline", href: "/" },
      { label: "Analytics", href: "/analytics" },
      { label: "Profile", href: "/profile" },
      { label: "Team management", href: "/admin/users" },
      { label: "Workspace settings", href: "/settings" },
    ],
    can: [
      "Manage branding, terminology, template, and plan",
      "Configure alert recipients and grant notification delegations",
      "Invite and assign any role, including Super Admin",
      "Add, archive, and restore sources and catalog items",
      "Sync, save, export, and share opportunities",
    ],
    cannot: [
      "Modify or remove other Super Admin accounts (protected seats)",
      "Change their own role from Team (use another Super Admin)",
    ],
  },
  admin: {
    role: "admin",
    label: ROLE_LABELS.admin,
    tagline: "Operations lead",
    summary:
      "Runs day-to-day ops and the team — not workspace identity or billing. Cannot touch Super Admin accounts.",
    pages: [
      { label: "Tenders / pipeline", href: "/" },
      { label: "Analytics", href: "/analytics" },
      { label: "Profile", href: "/profile" },
      { label: "Team management", href: "/admin/users" },
    ],
    can: [
      "Invite Admins, Analysts, and Viewers — never Super Admins",
      "Activate, deactivate, and remove those roles",
      "Add, archive, and restore sources and service lines",
      "Add regions and countries to the catalog",
      "Sync, save, export, and share opportunities",
    ],
    cannot: [
      "Open Workspace settings (branding, plan, lexicon, template) by default",
      "Manage workspace alert recipients unless a Super Admin delegates it",
      "Create, edit, or remove Super Admin accounts",
      "Promote anyone to Super Admin",
    ],
  },
  analyst: {
    role: "analyst",
    label: ROLE_LABELS.analyst,
    tagline: "Pipeline worker",
    summary:
      "Works the opportunity pipeline — add sources, sync, save and export. Cannot archive catalog or manage people.",
    pages: [
      { label: "Tenders / pipeline", href: "/" },
      { label: "Analytics", href: "/analytics" },
      { label: "Profile", href: "/profile" },
    ],
    can: [
      "Add sources, service lines, regions, and countries (additive only)",
      "Install catalog sources and upload documents",
      "Sync sources and save, export, or share opportunities",
      "Save a personal filter view (does not change the workspace catalog)",
    ],
    cannot: [
      "Open Team or Workspace settings",
      "Archive, restore, or permanently delete sources and service lines",
      "Invite teammates or change anyone’s role",
    ],
  },
  viewer: {
    role: "viewer",
    label: ROLE_LABELS.viewer,
    tagline: "Browse only",
    summary:
      "Read-only access to opportunities and analytics. Personal email alert prefs and filter views only — no pipeline mutations.",
    pages: [
      { label: "Tenders / pipeline", href: "/", note: "Browse only" },
      { label: "Analytics", href: "/analytics" },
      { label: "Profile", href: "/profile" },
    ],
    can: [
      "Browse matching opportunities and open details",
      "Apply filters and save a personal view",
      "Manage personal Gmail alert preferences on Profile",
    ],
    cannot: [
      "Sync, save (star), export, or create share links",
      "Add or change sources and catalog items",
      "Open Team or Workspace settings",
      "Invite or manage other users",
    ],
  },
};

export function getRoleGuide(role: UserRole): RoleGuide {
  return ROLE_GUIDES[role];
}

export function listRoleGuides(roles: UserRole[] = ROLES): RoleGuide[] {
  return roles.map((role) => ROLE_GUIDES[role]);
}

/** Short line for selects / badges */
export function roleSelectHint(role: UserRole): string {
  return ROLE_GUIDES[role].tagline;
}

export function roleWelcomeLine(role: UserRole): string {
  return ROLE_GUIDES[role].summary;
}

export function rolePagesLine(role: UserRole): string {
  return ROLE_GUIDES[role].pages
    .map((page) => (page.note ? `${page.label} (${page.note})` : page.label))
    .join(", ");
}
