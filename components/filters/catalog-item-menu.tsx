"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Archive, ArchiveRestore, MoreHorizontal, Trash2 } from "lucide-react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

type CatalogItemAction = "archive" | "restore" | "delete";

type CatalogItemKind = "source" | "service-line";

type CatalogItemMenuProps = {
  kind: CatalogItemKind;
  itemId: number;
  itemName: string;
  isBuiltIn?: boolean;
  archived?: boolean;
  onChanged: () => void;
  className?: string;
};

type PendingAction = {
  action: CatalogItemAction;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
};

type MenuPosition = {
  top: number;
  left: number;
};

const MENU_MIN_WIDTH = 168;
const MENU_GAP = 6;

function endpointFor(kind: CatalogItemKind, id: number) {
  return kind === "source" ? `/api/sources/${id}` : `/api/service-lines/${id}`;
}

export function CatalogItemMenu({
  kind,
  itemId,
  itemName,
  isBuiltIn = false,
  archived = false,
  onChanged,
  className,
}: CatalogItemMenuProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<MenuPosition | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updateMenuPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const menuHeight = menu?.offsetHeight ?? (isBuiltIn ? 44 : 88);
    const menuWidth = Math.max(menu?.offsetWidth ?? MENU_MIN_WIDTH, MENU_MIN_WIDTH);

    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUp = spaceBelow < menuHeight + MENU_GAP && spaceAbove > spaceBelow;

    let top = openUp
      ? rect.top - menuHeight - MENU_GAP
      : rect.bottom + MENU_GAP;
    let left = rect.right - menuWidth;

    top = Math.max(MENU_GAP, Math.min(top, window.innerHeight - menuHeight - MENU_GAP));
    left = Math.max(MENU_GAP, Math.min(left, window.innerWidth - menuWidth - MENU_GAP));

    setMenuPosition({ top, left });
  }, [isBuiltIn]);

  useLayoutEffect(() => {
    if (!menuOpen) {
      setMenuPosition(null);
      return;
    }

    updateMenuPosition();
    const frame = requestAnimationFrame(() => updateMenuPosition());

    const onScrollOrResize = () => updateMenuPosition();
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [menuOpen, updateMenuPosition, archived, isBuiltIn]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  function openAction(action: CatalogItemAction) {
    setError(null);
    setMenuOpen(false);

    if (action === "archive") {
      setPending({
        action,
        title: `Archive ${itemName}?`,
        description:
          kind === "source"
            ? "Archived sources stop syncing and disappear from filters. Existing tenders stay in the database."
            : "Archived service lines disappear from filters. Past tender matches are kept.",
        confirmLabel: "Archive",
        destructive: true,
      });
      return;
    }

    if (action === "restore") {
      setPending({
        action,
        title: `Restore ${itemName}?`,
        description:
          kind === "source"
            ? "This source will reappear in filters and can sync again."
            : "This service line will reappear in filters.",
        confirmLabel: "Restore",
      });
      return;
    }

    setPending({
      action,
      title: `Delete ${itemName} permanently?`,
      description: isBuiltIn
        ? "Built-in items cannot be deleted."
        : kind === "source"
          ? "Only sources with zero linked tenders can be deleted. Otherwise archive instead."
          : "This removes the service line and its filter matches. This cannot be undone.",
      confirmLabel: "Delete permanently",
      destructive: true,
    });
  }

  async function executeAction() {
    if (!pending) return;
    setLoading(true);
    setError(null);

    const endpoint = endpointFor(kind, itemId);
    const response =
      pending.action === "delete"
        ? await fetch(endpoint, { method: "DELETE" })
        : await fetch(endpoint, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: pending.action === "archive" ? "archive" : "restore",
            }),
          });

    setLoading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(
        typeof data.error === "string"
          ? data.error
          : "Action failed. Try again or archive instead.",
      );
      return;
    }

    setPending(null);
    onChanged();
  }

  const menuItems = (
    <div
      ref={menuRef}
      role="menu"
      style={
        menuPosition
          ? { top: menuPosition.top, left: menuPosition.left }
          : { top: -9999, left: -9999, visibility: "hidden" as const }
      }
      className="fixed z-[100] min-w-[10.5rem] overflow-hidden rounded-xl border border-white/10 bg-[hsl(222_47%_9%)] py-1 shadow-xl shadow-black/50"
    >
      {!archived ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => openAction("archive")}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/5"
        >
          <Archive className="h-3.5 w-3.5 text-amber-300" />
          Archive
        </button>
      ) : (
        <button
          type="button"
          role="menuitem"
          onClick={() => openAction("restore")}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 hover:bg-white/5"
        >
          <ArchiveRestore className="h-3.5 w-3.5 text-emerald-300" />
          Restore
        </button>
      )}
      {!isBuiltIn && (
        <button
          type="button"
          role="menuitem"
          onClick={() => openAction("delete")}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-200 hover:bg-red-500/10"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete permanently
        </button>
      )}
    </div>
  );

  return (
    <>
      <div className={cn("relative", className)}>
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-white/10 hover:text-slate-200",
            menuOpen && "bg-white/10 text-slate-200",
          )}
          aria-label={`Manage ${itemName}`}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
      </div>

      {mounted &&
        menuOpen &&
        createPortal(
          <>
            <button
              type="button"
              className="fixed inset-0 z-[90] cursor-default bg-transparent"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
            />
            {menuItems}
          </>,
          document.body,
        )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPending(null);
            setError(null);
          }
        }}
        title={pending?.title ?? ""}
        description={pending?.description ?? ""}
        error={error}
        confirmLabel={pending?.confirmLabel}
        destructive={pending?.destructive}
        loading={loading}
        onConfirm={executeAction}
      />
    </>
  );
}
