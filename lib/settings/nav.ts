import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CreditCard,
  Home,
  Languages,
  Layers,
  Palette,
  ShieldCheck,
} from "lucide-react";

export type SettingsNavItem = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Requires full settings:manage (super admin). */
  manageOnly?: boolean;
};

export type SettingsNavGroup = {
  id: string;
  label: string;
  items: SettingsNavItem[];
};

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        href: "/settings",
        label: "Hub",
        description: "Status at a glance",
        icon: Home,
      },
    ],
  },
  {
    id: "daily",
    label: "Daily operations",
    items: [
      {
        href: "/settings/notifications",
        label: "Notifications",
        description: "Alert recipients & delivery",
        icon: Bell,
      },
      {
        href: "/settings/delegations",
        label: "Delegations",
        description: "Grant recipient management",
        icon: ShieldCheck,
        manageOnly: true,
      },
    ],
  },
  {
    id: "identity",
    label: "Workspace identity",
    items: [
      {
        href: "/settings/branding",
        label: "Branding",
        description: "Logo, cover & colors",
        icon: Palette,
        manageOnly: true,
      },
      {
        href: "/settings/lexicon",
        label: "Terminology",
        description: "Product labels & language",
        icon: Languages,
        manageOnly: true,
      },
      {
        href: "/settings/template",
        label: "Template",
        description: "Vertical defaults & reapply",
        icon: Layers,
        manageOnly: true,
      },
    ],
  },
  {
    id: "access",
    label: "Access & plan",
    items: [
      {
        href: "/settings/plan",
        label: "Plan",
        description: "Usage, limits & upgrade",
        icon: CreditCard,
        manageOnly: true,
      },
    ],
  },
];

export function filterSettingsNavGroups(
  canManageSettings: boolean,
): SettingsNavGroup[] {
  return SETTINGS_NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.manageOnly || canManageSettings),
  })).filter((group) => group.items.length > 0);
}

export function isSettingsNavActive(pathname: string, href: string): boolean {
  if (href === "/settings") return pathname === "/settings";
  return pathname === href || pathname.startsWith(`${href}/`);
}
