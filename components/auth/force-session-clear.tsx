"use client";

import { useEffect, useRef } from "react";
import { signOut } from "next-auth/react";

import {
  buildLoginUrl,
  FORCE_LOGOUT_ATTEMPT_KEY,
  SIGN_OUT_STORAGE_KEY,
} from "@/lib/auth/sign-out-constants";
import { clearSignOutState } from "@/lib/auth/sign-out-client";

type ForceSessionClearProps = {
  /** When true, force a client-side session wipe then stay on /login. */
  active?: boolean;
};

/**
 * Safety net when middleware/login still see a JWT after the logout redirect.
 * Runs at most once per tab to avoid redirect loops.
 */
export function ForceSessionClear({ active = false }: ForceSessionClearProps) {
  const ran = useRef(false);

  useEffect(() => {
    if (!active || ran.current) return;
    ran.current = true;

    let alreadyAttempted = false;
    try {
      alreadyAttempted =
        sessionStorage.getItem(FORCE_LOGOUT_ATTEMPT_KEY) === "1";
    } catch {
      alreadyAttempted = false;
    }

    if (alreadyAttempted) {
      clearSignOutState();
      return;
    }

    let cancelled = false;

    async function wipe() {
      try {
        sessionStorage.setItem(FORCE_LOGOUT_ATTEMPT_KEY, "1");
        sessionStorage.setItem(SIGN_OUT_STORAGE_KEY, "1");
      } catch {
        // ignore
      }

      try {
        await signOut({ redirect: false });
      } catch {
        // ignore — server route is the source of truth for cookies
      }

      if (cancelled) return;

      const login = buildLoginUrl(true);
      window.location.replace(
        `/api/auth/logout?redirect=${encodeURIComponent(login)}`,
      );
    }

    void wipe();

    return () => {
      cancelled = true;
    };
  }, [active]);

  return null;
}
