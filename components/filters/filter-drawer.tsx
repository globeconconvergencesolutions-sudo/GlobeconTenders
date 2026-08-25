"use client";

import { useEffect, useId, useRef } from "react";
import { Check, Filter, Loader2, X } from "lucide-react";

import { OpportunityFilters } from "@/components/filters/opportunity-filters";
import { useFilterWorkspace } from "@/components/filters/filter-workspace-context";
import { useLexicon } from "@/components/providers/org-context-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FilterDrawer() {
  const {
    open,
    closeFilters,
    openFilters,
    applying,
    justApplied,
    activeCount,
  } = useFilterWorkspace();
  const { lexicon } = useLexicon();
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      closeRef.current?.focus();
    });

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const editable =
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable;

      if (event.key === "Escape" && open) {
        event.preventDefault();
        closeFilters();
        return;
      }

      if (
        !editable &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        (event.key === "f" || event.key === "F")
      ) {
        event.preventDefault();
        if (open) closeFilters();
        else openFilters();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closeFilters, openFilters]);

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    if (!panel) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => panel.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60]",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        className={cn(
          "absolute inset-0 bg-slate-950/45 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={closeFilters}
        aria-label="Close filters overlay"
        tabIndex={open ? 0 : -1}
      />

      <div
        ref={panelRef}
        className={cn(
          "absolute flex flex-col overflow-hidden bg-slate-50 shadow-2xl transition-transform duration-300 ease-out dark:bg-background",
          "inset-x-0 bottom-0 h-[min(92dvh,920px)] max-h-[92dvh] rounded-t-3xl border border-slate-200 dark:border-border",
          open ? "translate-y-0" : "translate-y-[110%]",
          "lg:inset-y-0 lg:bottom-auto lg:right-0 lg:left-auto lg:h-dvh lg:max-h-dvh lg:w-full lg:max-w-md lg:translate-y-0 lg:rounded-none lg:border-y-0 lg:border-l lg:border-r-0",
          open ? "lg:translate-x-0" : "lg:translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={applying}
        aria-label={`${lexicon.opportunityPlural} filters`}
      >
        {/* Indeterminate progress while filters apply */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 z-20 h-1 overflow-hidden bg-blue-100/80 transition-opacity duration-200 dark:bg-blue-950/50",
            applying ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={!applying}
        >
          <div className="h-full w-full animate-pulse bg-gradient-to-r from-transparent via-blue-600 to-transparent" />
        </div>

        <div className="flex shrink-0 flex-col border-b border-slate-200/80 dark:border-border">
          <div className="flex justify-center pt-3 lg:hidden" aria-hidden>
            <div className="h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>
          <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5 lg:py-4">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-lg transition-colors",
                  applying
                    ? "bg-blue-600 shadow-blue-600/30"
                    : justApplied
                      ? "bg-emerald-600 shadow-emerald-600/25"
                      : "bg-blue-600 shadow-blue-600/20",
                )}
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : justApplied ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : (
                  <Filter className="h-4 w-4" aria-hidden />
                )}
              </div>
              <div>
                <p
                  id={titleId}
                  className="text-base font-semibold tracking-tight"
                >
                  Filters
                </p>
                <p
                  className="text-xs text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  {applying
                    ? "Updating results…"
                    : justApplied
                      ? "Filters applied"
                      : activeCount > 0
                        ? `${activeCount} active`
                        : `All ${lexicon.opportunityPlural.toLowerCase()}`}
                  {!applying && !justApplied && (
                    <span className="ml-2 hidden text-[10px] uppercase tracking-wide text-slate-400 sm:inline">
                      Esc to close · F to toggle
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              ref={closeRef}
              type="button"
              onClick={closeFilters}
              aria-label="Close filters"
              className={cn(
                "inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition-colors",
                "hover:bg-slate-100 hover:text-slate-900",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                "dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
              )}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-6 sm:px-5 [-webkit-overflow-scrolling:touch]"
          data-filter-scroll-region
        >
          <OpportunityFilters />
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur dark:border-border dark:bg-card/95">
          <Button
            type="button"
            className="h-11 w-full rounded-xl text-sm font-semibold lg:hidden"
            onClick={closeFilters}
            disabled={applying}
          >
            {applying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating results…
              </>
            ) : justApplied ? (
              <>
                <Check className="h-4 w-4" />
                Show results
              </>
            ) : (
              "Show results"
            )}
          </Button>
          <div className="hidden gap-2 lg:flex">
            <Button
              type="button"
              variant="outline"
              className="h-11 flex-1 rounded-xl"
              onClick={closeFilters}
            >
              Close
            </Button>
            <Button
              type="button"
              className="h-11 flex-[1.4] rounded-xl font-semibold"
              onClick={closeFilters}
              disabled={applying}
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Updating…
                </>
              ) : justApplied ? (
                <>
                  <Check className="h-4 w-4" />
                  Done
                </>
              ) : (
                "Done"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
