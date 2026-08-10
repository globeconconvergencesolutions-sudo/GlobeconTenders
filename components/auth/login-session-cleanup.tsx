"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { clearSessionBeforeLogin, clearSignOutState } from "@/lib/auth/sign-out-client";
import { showSuccessToast } from "@/lib/toast";

type LoginSessionCleanupProps = {
  signedOut?: boolean;
};

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
        await clearSessionBeforeLogin();
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
