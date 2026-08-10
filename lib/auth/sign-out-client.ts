"use client";

import { signOut } from "next-auth/react";

import {
  buildLoginUrl,
  LOGIN_PATH,
  SIGN_OUT_STORAGE_KEY,
} from "@/lib/auth/sign-out-constants";

const SIGN_OUT_TIMEOUT_MS = 8000;
const SESSION_POLL_INTERVAL_MS = 150;
const SESSION_POLL_MAX_MS = 6000;

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

async function clearServerSession(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  });
}

async function clearClientSession(): Promise<void> {
  await Promise.race([
    signOut({ redirect: false }),
    new Promise<void>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Sign out timed out")),
        SIGN_OUT_TIMEOUT_MS,
      );
    }),
  ]);
}

async function waitForSessionCleared(): Promise<void> {
  const deadline = Date.now() + SESSION_POLL_MAX_MS;

  while (Date.now() < deadline) {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) return;

      const payload = (await response.json()) as { user?: unknown };
      if (!payload?.user) return;
    } catch {
      return;
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, SESSION_POLL_INTERVAL_MS);
    });
  }
}

/**
 * End the session completely, then hard-redirect to login.
 * Login is only reachable with no active session (enforced in middleware).
 */
export async function signOutToLogin(): Promise<void> {
  markSigningOut();

  try {
    await clearServerSession();
  } catch {
    // Continue with client sign-out even if the server route failed
  }

  try {
    await clearClientSession();
  } catch {
    // Still attempt session polling + redirect below
  }

  await waitForSessionCleared();

  window.location.replace(buildLoginUrl(true));
}
