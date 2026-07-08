"use client";

import { useState } from "react";
import { Check, Copy, Loader2, LogOut, Moon, Share2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";

import { Switch } from "@/components/ui/switch";

export function SidebarFooter() {
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut({ redirect: false });
      window.location.assign("/login");
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <div className="relative z-10 shrink-0 border-t border-white/[0.08] bg-[hsl(222_47%_7%)]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-12px_32px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl bg-white/[0.05] px-2.5 py-2">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Moon className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-[11px] font-medium">Dark</span>
          </div>
          <Switch
            checked={theme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            className="scale-90"
          />
        </div>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          disabled={signingOut}
          title="Sign out"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-slate-400 transition-colors hover:border-red-400/40 hover:bg-red-500/15 hover:text-red-200 disabled:opacity-60"
          aria-label="Sign out"
        >
          {signingOut ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}
