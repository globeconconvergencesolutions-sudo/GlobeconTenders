export const BRAND = {
  name: "Globecon",
  tagline: "Tender Watch",
  fullName: "Globecon Tender Watch",
  sourcePath: "assets/brand/logo-source.png",
  originalPath: "assets/brand/logo-source.original.png",
  backupPath: "assets/brand/logo-source.backup.png",
  publicDir: "public/brand",
} as const;

export const BRAND_ASSETS = {
  favicon: "/brand/favicon.ico",
  icon16: "/brand/icon-16.png",
  icon32: "/brand/icon-32.png",
  icon192: "/brand/icon-192.png",
  icon512: "/brand/icon-512.png",
  appleTouchIcon: "/brand/apple-touch-icon.png",
  logoSidebar: "/brand/logo-sidebar.png",
  logoLogin: "/brand/logo-login.png",
  logoMark: "/brand/logo-mark.png",
  ogImage: "/brand/og-image.png",
} as const;

export type BrandLogoSize = "xs" | "sm" | "md" | "lg" | "xl";

export const BRAND_LOGO_SIZES: Record<BrandLogoSize, number> = {
  xs: 28,
  sm: 36,
  md: 44,
  lg: 56,
  xl: 72,
};
