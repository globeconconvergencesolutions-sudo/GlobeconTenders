"use client";

import {
  buildLoginUrl,
  SIGN_OUT_STORAGE_KEY,
} from "@/lib/auth/sign-out-constants";

function markSigningOut(): void {
  try {
    sessionStorage.setItem(SIGN_OUT_STORAGE_KEY, "1");
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

/**
 * Hard navigation to server logout — clears cookie and redirects in one trip.
 * Avoids client signOut() which can fail to redirect and leave the overlay stuck.
 */
export function signOutToLogin(): void {
  markSigningOut();
  const login = buildLoginUrl(true);
  window.location.assign(
    `/api/auth/logout?redirect=${encodeURIComponent(login)}`,
  );
}
