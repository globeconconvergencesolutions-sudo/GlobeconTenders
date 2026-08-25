"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { FilterChip } from "@/lib/filters/catalog-types";

type FilterActions = {
  removeChip: (chip: FilterChip) => Promise<void> | void;
  clearAll: () => Promise<void> | void;
  /** Re-fetch saved DB defaults after “Save view”. */
  reloadDefaults?: () => Promise<void> | void;
};

type FilterWorkspaceContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  openFilters: (opts?: { focusAddSource?: boolean }) => void;
  closeFilters: () => void;
  applying: boolean;
  setApplying: (applying: boolean) => void;
  /** Brief success pulse after filters finish applying. */
  justApplied: boolean;
  markJustApplied: () => void;
  focusAddSource: boolean;
  clearFocusAddSource: () => void;
  activeCount: number;
  setActiveCount: (count: number) => void;
  chips: FilterChip[];
  setChips: (chips: FilterChip[]) => void;
  registerActions: (actions: FilterActions) => void;
  removeChip: (chip: FilterChip) => void;
  clearAll: () => void;
  reloadDefaults: () => void;
};

const FilterWorkspaceContext =
  createContext<FilterWorkspaceContextValue | null>(null);

export function FilterWorkspaceProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [justApplied, setJustApplied] = useState(false);
  const [focusAddSource, setFocusAddSource] = useState(false);
  const [activeCount, setActiveCount] = useState(0);
  const [chips, setChips] = useState<FilterChip[]>([]);
  const actionsRef = useRef<FilterActions | null>(null);
  const appliedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFilters = useCallback((opts?: { focusAddSource?: boolean }) => {
    setFocusAddSource(Boolean(opts?.focusAddSource));
    setOpen(true);
  }, []);

  const closeFilters = useCallback(() => {
    setOpen(false);
    setFocusAddSource(false);
  }, []);

  const clearFocusAddSource = useCallback(() => {
    setFocusAddSource(false);
  }, []);

  const markJustApplied = useCallback(() => {
    setJustApplied(true);
    if (appliedTimerRef.current) clearTimeout(appliedTimerRef.current);
    appliedTimerRef.current = setTimeout(() => setJustApplied(false), 900);
  }, []);

  const registerActions = useCallback((actions: FilterActions) => {
    actionsRef.current = actions;
  }, []);

  const removeChip = useCallback((chip: FilterChip) => {
    void actionsRef.current?.removeChip(chip);
  }, []);

  const clearAll = useCallback(() => {
    void actionsRef.current?.clearAll();
  }, []);

  const reloadDefaults = useCallback(() => {
    void actionsRef.current?.reloadDefaults?.();
  }, []);

  const value = useMemo(
    () => ({
      open,
      setOpen,
      openFilters,
      closeFilters,
      applying,
      setApplying,
      justApplied,
      markJustApplied,
      focusAddSource,
      clearFocusAddSource,
      activeCount,
      setActiveCount,
      chips,
      setChips,
      registerActions,
      removeChip,
      clearAll,
      reloadDefaults,
    }),
    [
      open,
      openFilters,
      closeFilters,
      applying,
      justApplied,
      markJustApplied,
      focusAddSource,
      clearFocusAddSource,
      activeCount,
      chips,
      registerActions,
      removeChip,
      clearAll,
      reloadDefaults,
    ],
  );

  return (
    <FilterWorkspaceContext.Provider value={value}>
      {children}
    </FilterWorkspaceContext.Provider>
  );
}

export function useFilterWorkspace() {
  const ctx = useContext(FilterWorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useFilterWorkspace must be used within FilterWorkspaceProvider",
    );
  }
  return ctx;
}
