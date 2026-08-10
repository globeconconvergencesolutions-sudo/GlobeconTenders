import type { WorkspaceLexiconSettings } from "@/lib/db/schema";

import { DEFAULT_PROCUREMENT_LEXICON } from "./defaults";

export { DEFAULT_PROCUREMENT_LEXICON };

export type LexiconKey = keyof WorkspaceLexiconSettings;

export function resolveLexicon(
  stored?: Partial<WorkspaceLexiconSettings> | null,
): WorkspaceLexiconSettings {
  if (!stored) return { ...DEFAULT_PROCUREMENT_LEXICON };
  return { ...DEFAULT_PROCUREMENT_LEXICON, ...stored };
}

export function createLexiconTranslator(lexicon: WorkspaceLexiconSettings) {
  return function t(key: LexiconKey): string {
    return lexicon[key];
  };
}

export type LexiconTranslator = ReturnType<typeof createLexiconTranslator>;
