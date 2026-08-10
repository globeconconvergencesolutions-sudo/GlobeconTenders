import {
  getPlatformAppUrl,
  WORKSPACE_LOGIN_PARAM,
} from "@/lib/tenant/config";
import { isValidOrgSlug } from "@/lib/tenant/resolution";

/** Single-URL login link for a workspace (safe for client components). */
export function buildOrgLoginUrl(slug: string): string {
  const url = new URL("/login", getPlatformAppUrl());
  const normalized = slug.trim().toLowerCase();
  if (normalized && isValidOrgSlug(normalized)) {
    url.searchParams.set(WORKSPACE_LOGIN_PARAM, normalized);
  }
  return url.toString();
}
