"use client";

import { signOut } from "next-auth/react";

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
 * One NextAuth sign-out + redirect. Clears the session cookie and sends the
 * browser to login — no polling, no duplicate server/client logout calls.
 */
export function signOutToLogin(): void {
  markSigningOut();
  void signOut({ callbackUrl: buildLoginUrl(true), redirect: true });
}
