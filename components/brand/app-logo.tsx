"use client";

import { useState } from "react";
import { Globe2 } from "lucide-react";

import { useOptionalOrg } from "@/components/providers/org-context-provider";
import {
  BRAND,
  BRAND_ASSETS,
  BRAND_LOGO_SIZES,
  type BrandLogoSize,
} from "@/lib/brand";
import type { ResolvedBranding } from "@/lib/branding/resolve";
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
  const src = branding?.logoUrl || variantAsset[variant];
  const displayName = branding?.displayName ?? BRAND.name;
  const tagline = branding?.productTagline ?? BRAND.tagline;
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-700/20 ring-1 ring-white/10 shadow-lg shadow-blue-900/30"
        style={{ width: px, height: px }}
      >
        {imageFailed ? (
          <Globe2
            className="text-blue-300"
            style={{ width: Math.round(px * 0.55), height: Math.round(px * 0.55) }}
          />
        ) : (
          // Native img avoids Next.js optimizer issues (OneDrive placeholders, tiny PNGs).
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`${displayName} logo`}
            width={px}
            height={px}
            className="h-full w-full object-contain p-0.5"
            decoding="async"
            onError={() => setImageFailed(true)}
          />
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
