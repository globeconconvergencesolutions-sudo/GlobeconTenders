"use client";

import { createContext, useContext, useMemo } from "react";

import type { ResolvedBranding } from "@/lib/branding/resolve";
import type { WorkspaceLexiconSettings } from "@/lib/db/schema";
import {
  createLexiconTranslator,
  type LexiconKey,
  type LexiconTranslator,
} from "@/lib/lexicon";
import type { OrgContextValue } from "@/lib/tenant/org-context";

export type OrgContextClientValue = OrgContextValue & {
  t: LexiconTranslator;
};

const OrgContext = createContext<OrgContextClientValue | null>(null);

type OrgContextProviderProps = {
  value: OrgContextValue;
  children: React.ReactNode;
};

export function OrgContextProvider({ value, children }: OrgContextProviderProps) {
  const memo = useMemo(
    () => ({
      ...value,
      t: createLexiconTranslator(value.lexicon),
    }),
    [value],
  );

  return <OrgContext.Provider value={memo}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextClientValue {
  const ctx = useContext(OrgContext);
  if (!ctx) {
    throw new Error("useOrg must be used within OrgContextProvider");
  }
  return ctx;
}

export function useOptionalOrg(): OrgContextClientValue | null {
  return useContext(OrgContext);
}

export function useLexicon() {
  const { lexicon, t } = useOrg();
  return { lexicon, t };
}

export function useFeatures() {
  const { features } = useOrg();
  return features;
}

export function useLayout() {
  const { layout } = useOrg();
  return layout;
}

export type { LexiconKey };
