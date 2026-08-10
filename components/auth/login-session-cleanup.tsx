"use client";

import { useEffect } from "react";

import { clearSignOutState } from "@/lib/auth/sign-out-client";
import { showSuccessToast } from "@/lib/toast";

type LoginSessionCleanupProps = {
  signedOut?: boolean;
};

export function LoginSessionCleanup({ signedOut = false }: LoginSessionCleanupProps) {
  useEffect(() => {
    clearSignOutState();

    if (signedOut) {
      showSuccessToast("You have been signed out");
    }
  }, [signedOut]);

  return null;
}
