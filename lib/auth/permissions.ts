import type { UserRole } from "@/lib/db/schema";

export const ROLES: UserRole[] = [
  "super_admin",
  "admin",
  "analyst",
  "viewer",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  analyst: "Analyst",
  viewer: "Viewer",
};

export const PERMISSIONS = {
  "sources:read": ["super_admin", "admin", "analyst", "viewer"],
  "sources:create": ["super_admin", "admin", "analyst"],
  "sources:update": ["super_admin", "admin"],
  "sources:delete": ["super_admin", "admin"],
  "sources:sync": ["super_admin", "admin", "analyst"],
  "service_lines:read": ["super_admin", "admin", "analyst", "viewer"],
  "service_lines:create": ["super_admin", "admin", "analyst"],
  "service_lines:delete": ["super_admin", "admin"],
  "regions:read": ["super_admin", "admin", "analyst", "viewer"],
  "regions:create": ["super_admin", "admin", "analyst"],
  "regions:delete": ["super_admin", "admin"],
  "countries:create": ["super_admin", "admin", "analyst"],
  "countries:delete": ["super_admin", "admin"],
  "tenders:save": ["super_admin", "admin", "analyst"],
  "tenders:export": ["super_admin", "admin", "analyst"],
  "users:read": ["super_admin", "admin"],
  "users:create": ["super_admin", "admin"],
  "users:update": ["super_admin", "admin"],
  "users:delete": ["super_admin", "admin"],
  "users:manage": ["super_admin"],
  "settings:manage": ["super_admin"],
  "settings:notifications": ["super_admin"],
  "documents:upload": ["super_admin", "admin", "analyst"],
} as const satisfies Record<string, UserRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly UserRole[]).includes(role);
}

export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, "users:update");
}

export function canCreateUsers(role: UserRole): boolean {
  return hasPermission(role, "users:create");
}

export function canDeleteUsers(role: UserRole): boolean {
  return hasPermission(role, "users:delete");
}

export function canSync(role: UserRole): boolean {
  return hasPermission(role, "sources:sync");
}

export function canCreateSources(role: UserRole): boolean {
  return hasPermission(role, "sources:create");
}

export function canUploadDocuments(role: UserRole): boolean {
  return hasPermission(role, "documents:upload");
}

export function canSaveTenders(role: UserRole): boolean {
  return hasPermission(role, "tenders:save");
}

export function canExportTenders(role: UserRole): boolean {
  return hasPermission(role, "tenders:export");
}

export function canManageCatalog(role: UserRole): boolean {
  return role === "super_admin" || role === "admin";
}

export function canAccessSettingsHub(role: UserRole): boolean {
  return hasPermission(role, "settings:manage");
}

export function canDeleteCatalogItems(role: UserRole): boolean {
  return hasPermission(role, "sources:delete");
}

export function assignableRoles(actorRole: UserRole): UserRole[] {
  if (actorRole === "super_admin") {
    return ROLES;
  }
  if (actorRole === "admin") {
    return ["admin", "analyst", "viewer"];
  }
  return [];
}
