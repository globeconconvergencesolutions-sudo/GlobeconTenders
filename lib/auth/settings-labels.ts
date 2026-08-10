import type { DelegatableSettingsPermission } from "@/lib/db/schema";

export function isDelegatablePermission(
  value: string,
): value is DelegatableSettingsPermission {
  return value === "settings:notifications";
}

export const SETTINGS_PERMISSION_LABELS: Record<
  DelegatableSettingsPermission,
  string
> = {
  "settings:notifications": "Manage alert recipients",
};
