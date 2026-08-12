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
 * Hard navigation to server logout — clears cookie and redirects in one trip.
 * Avoids client signOut() which can fail to redirect and leave the overlay stuck.
 */
export function signOutToLogin(): void {
  markSigningOut();
  const login = buildLoginUrl(true);
  // replace so Back doesn't re-hit an authenticated page mid-logout
  window.location.replace(
    `/api/auth/logout?redirect=${encodeURIComponent(login)}`,
  );
}
