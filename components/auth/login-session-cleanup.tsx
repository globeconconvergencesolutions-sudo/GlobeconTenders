"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { clearSignOutState } from "@/lib/auth/sign-out-client";
import { showSuccessToast } from "@/lib/toast";

type LoginSessionCleanupProps = {
  signedOut?: boolean;
};

async function clearStaleSessionOnClient(): Promise<void> {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    // continue with client sign-out
  }

  try {
    await signOut({ redirect: false });
  } catch {
    // session may already be cleared
  }
}

export function LoginSessionCleanup({ signedOut = false }: LoginSessionCleanupProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const staleCleanupStarted = useRef(false);
  const toastShown = useRef(false);

  useEffect(() => {
    clearSignOutState();
  }, []);

  useEffect(() => {
    if (!signedOut || status === "loading") return;

    if (session?.user && !staleCleanupStarted.current) {
      staleCleanupStarted.current = true;
      void (async () => {
        await clearStaleSessionOnClient();
        router.refresh();
      })();
      return;
    }

    if (!session?.user && !toastShown.current) {
      toastShown.current = true;
      showSuccessToast("You have been signed out");
    }
  }, [signedOut, session, status, router]);

  return null;
}
