"use client";

import {
  buildLoginUrl,
  FORCE_LOGOUT_ATTEMPT_KEY,
  SIGN_OUT_STORAGE_KEY,
} from "@/lib/auth/sign-out-constants";

function markSigningOut(): void {
  try {
    sessionStorage.setItem(SIGN_OUT_STORAGE_KEY, "1");
    sessionStorage.removeItem(FORCE_LOGOUT_ATTEMPT_KEY);
  } catch {
    // ignore private browsing / storage blocks
  }
}

export function clearSignOutState(): void {
  try {
    sessionStorage.removeItem(SIGN_OUT_STORAGE_KEY);
  } catch {
    // ignore
  }
}

export function clearForceLogoutAttempt(): void {
  try {
    sessionStorage.removeItem(FORCE_LOGOUT_ATTEMPT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Hard navigation to server logout — clears cookie via 200 HTML response,
 * then client lands on login. Cache-bust so CDNs never serve a stale logout page.
 */
export function signOutToLogin(): void {
  markSigningOut();
  const login = buildLoginUrl(true);
  const url = `/api/auth/logout?redirect=${encodeURIComponent(login)}&t=${Date.now()}`;
  window.location.replace(url);
}
