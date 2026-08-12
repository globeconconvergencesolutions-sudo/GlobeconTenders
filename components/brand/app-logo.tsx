"use client";

import { useState } from "react";

import { useOptionalOrg } from "@/components/providers/org-context-provider";
import {
  BRAND,
  BRAND_ASSETS,
  BRAND_LOGO_SIZES,
  type BrandLogoSize,
} from "@/lib/brand";
import type { ResolvedBranding } from "@/lib/branding/resolve";
import { DEFAULT_ORG_SLUG } from "@/lib/tenant/config";
import { cn } from "@/lib/utils";

type AppLogoProps = {
  size?: BrandLogoSize;
  showText?: boolean;
  compact?: boolean;
  variant?: "sidebar" | "login" | "mark";
  className?: string;
  textClassName?: string;
  brandingOverride?: ResolvedBranding;
};

const variantAsset = {
  sidebar: BRAND_ASSETS.logoSidebar,
  login: BRAND_ASSETS.logoLogin,
  mark: BRAND_ASSETS.logoMark,
} as const;

export function AppLogo({
  size = "md",
  showText = true,
  compact = false,
  variant = "sidebar",
  className,
  textClassName,
  brandingOverride,
}: AppLogoProps) {
  const org = useOptionalOrg();
  const branding = brandingOverride ?? org?.branding;
  const px = BRAND_LOGO_SIZES[size];
  const orgSlug = org?.orgSlug ?? "";
  // Platform (Globecon) logo assets are only for the home org or custom uploads.
  // Other tenants get an initial mark so Globecon branding never leaks.
  const resolvedSrc = branding?.logoUrl
    ? branding.logoUrl
    : orgSlug === DEFAULT_ORG_SLUG
      ? variantAsset[variant]
      : null;
  const displayName = branding?.displayName ?? BRAND.name;
  const tagline = branding?.productTagline ?? BRAND.tagline;
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(resolvedSrc) && !imageFailed;

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-700/20 ring-1 ring-white/10 shadow-lg shadow-blue-900/30"
        style={{ width: px, height: px }}
      >
        {showImage ? (
          // Native img avoids Next.js optimizer issues (OneDrive placeholders, tiny PNGs).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolvedSrc!}
            alt={`${displayName} logo`}
            width={px}
            height={px}
            className="h-full w-full object-contain p-0.5"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <span
            className="flex items-center justify-center font-bold text-blue-200"
            style={{ fontSize: Math.round(px * 0.36) }}
            aria-hidden
          >
            {(displayName.trim().charAt(0) || "W").toUpperCase()}
          </span>
        )}
      </div>
      {showText && (
        <div className={cn(compact && "min-w-0", textClassName)}>
          <p className="text-base font-bold tracking-tight text-white">
            {displayName}
          </p>
          {!compact && (
            <p className="text-[10px] font-semibold tracking-[0.18em] text-blue-200/70">
              {tagline.toUpperCase()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
