"use client";

import { signOut } from "next-auth/react";

import {
  buildLoginUrl,
  LOGIN_PATH,
  SIGN_OUT_STORAGE_KEY,
} from "@/lib/auth/sign-out-constants";

const SIGN_OUT_TIMEOUT_MS = 8000;
const SESSION_POLL_INTERVAL_MS = 150;
const SESSION_POLL_MAX_MS = 4000;

function markSigningOut(): void {
  try {
    sessionStorage.setItem(SIGN_OUT_STORAGE_KEY, "1");
  } catch {
    // ignore private browsing / storage blocks
  }
}

function clearSigningOut(): void {
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

async function clearClientSession(callbackUrl: string): Promise<void> {
  await Promise.race([
    signOut({ callbackUrl, redirect: false }),
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

async function waitForSessionOrg(orgSlug: string): Promise<boolean> {
  const deadline = Date.now() + SESSION_POLL_MAX_MS;
  const normalized = orgSlug.trim().toLowerCase();

  while (Date.now() < deadline) {
    try {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) continue;

      const payload = (await response.json()) as {
        user?: { orgSlug?: string };
      };
      if (payload?.user?.orgSlug?.toLowerCase() === normalized) return true;
    } catch {
      // keep polling
    }

    await new Promise((resolve) => {
      window.setTimeout(resolve, SESSION_POLL_INTERVAL_MS);
    });
  }

  return false;
}

/**
 * Sign out on server + client, wait until the session cookie is gone, then hard
 * redirect to login. Prevents the login page from bouncing back to the dashboard
 * when middleware still sees a stale session.
 */
export async function signOutToLogin(): Promise<void> {
  markSigningOut();

  const callbackUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${LOGIN_PATH}`
      : LOGIN_PATH;

  try {
    await clearServerSession();
  } catch {
    // Continue with client sign-out even if the server route failed
  }

  try {
    await clearClientSession(callbackUrl);
  } catch {
    // Still attempt session polling + redirect below
  }

  await waitForSessionCleared();

  window.location.replace(buildLoginUrl(true));
}

export function clearSignOutState(): void {
  clearSigningOut();
}

/** Clear session before credentials sign-in so workspace/org changes apply. */
export async function clearSessionBeforeLogin(): Promise<void> {
  try {
    await clearServerSession();
  } catch {
    // continue with client sign-out
  }

  try {
    await signOut({ redirect: false });
  } catch {
    // session may already be cleared
  }

  await waitForSessionCleared();
}

/** After sign-in, wait until JWT reflects the chosen workspace. */
export async function waitForLoginSession(orgSlug: string): Promise<boolean> {
  return waitForSessionOrg(orgSlug);
}
