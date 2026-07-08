"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { SidebarBrand, SidebarPanel } from "@/components/layout/sidebar-panel";
import { Button } from "@/components/ui/button";
import {
  getSidebarMode,
  sidebarWidthClass,
} from "@/lib/navigation/sidebar-routes";
import { cn } from "@/lib/utils";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mode = getSidebarMode(pathname);
  const isAuthRoute =
    pathname === "/login" || pathname.startsWith("/login/");
  const isShareRoute = pathname === "/share" || pathname.startsWith("/share/");

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isAuthRoute && !isShareRoute) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "auto";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isAuthRoute, isShareRoute]);

  useEffect(() => {
    if (!mobileOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  if (isAuthRoute || isShareRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside
        className={cn(
          "hidden h-full min-h-0 shrink-0 overflow-hidden text-sidebar-foreground transition-[width] duration-200 lg:flex lg:flex-col",
          sidebarWidthClass(mode, "desktop"),
        )}
        aria-label="Main navigation"
      >
        <SidebarPanel />
      </aside>

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          className={cn(
            "absolute inset-0 bg-black/50 transition-opacity duration-200",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu overlay"
          tabIndex={mobileOpen ? 0 : -1}
        />
        <aside
          className={cn(
            "absolute inset-y-0 left-0 flex h-full min-h-0 flex-col overflow-hidden text-sidebar-foreground shadow-2xl transition-transform duration-200 ease-out",
            sidebarWidthClass(mode, "mobile"),
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
          aria-label="Mobile navigation"
        >
          <SidebarPanel
            showClose
            onClose={() => setMobileOpen(false)}
            onNavigate={() => setMobileOpen(false)}
          />
        </aside>
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 lg:hidden">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-slate-300 hover:bg-sidebar-accent hover:text-white"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <SidebarBrand compact />
        </header>

        <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
          {children}
        </main>
      </div>
    </div>
  );
}
