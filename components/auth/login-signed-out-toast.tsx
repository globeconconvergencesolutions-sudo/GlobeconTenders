"use client";

import { useEffect, useRef } from "react";

import { clearSignOutState } from "@/lib/auth/sign-out-client";
import { showSuccessToast } from "@/lib/toast";

type LoginSignedOutToastProps = {
  signedOut?: boolean;
};

/** Shows a one-time toast after a successful logout redirect. */
export function LoginSignedOutToast({ signedOut = false }: LoginSignedOutToastProps) {
  const shown = useRef(false);

  useEffect(() => {
    clearSignOutState();
  }, []);

  useEffect(() => {
    if (!signedOut || shown.current) return;
    shown.current = true;
    showSuccessToast("You have been signed out");
  }, [signedOut]);

  return null;
}
