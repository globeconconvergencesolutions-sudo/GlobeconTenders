import { DEFAULT_ORG_SLUG } from "@/lib/tenant/config";

/** Globecon owns platform administration — only while signed into that workspace. */
export function canAccessPlatformAdmin(input: {
  isPlatformAdmin: boolean;
  orgSlug: string;
}): boolean {
  return (
    input.isPlatformAdmin &&
    input.orgSlug.trim().toLowerCase() === DEFAULT_ORG_SLUG
  );
}
