"use client";

import { useEffect, useState } from "react";
import { Loader2, LogOut } from "lucide-react";

import { SIGN_OUT_STORAGE_KEY } from "@/lib/auth/sign-out-constants";

export function SignOutOverlay() {
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    function syncState() {
      try {
        setSigningOut(sessionStorage.getItem(SIGN_OUT_STORAGE_KEY) === "1");
      } catch {
        setSigningOut(false);
      }
    }

    syncState();
    const interval = window.setInterval(syncState, 100);
    window.addEventListener("storage", syncState);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", syncState);
      window.removeEventListener("focus", syncState);
    };
  }, []);

  if (!signingOut) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center gap-4 bg-slate-950/90 text-white backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Signing out"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
        <LogOut className="h-6 w-6" />
      </div>
      <div className="flex items-center gap-2 text-sm font-medium">
        <Loader2 className="h-4 w-4 animate-spin" />
        Signing you out…
      </div>
    </div>
  );
}
