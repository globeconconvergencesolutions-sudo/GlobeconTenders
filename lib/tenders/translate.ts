import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import { translationCache } from "@/lib/db/schema";

type Db = NonNullable<ReturnType<typeof getDb>>;

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";
const MAX_BYTES = 450;
const DESCRIPTION_LIMIT = 900;

const LANGUAGE_WORDS: Record<string, string[]> = {
  fr: [
    "pour",
    "des",
    "les",
    "dans",
    "avec",
    "une",
    "aux",
    "cette",
    "entretien",
    "nettoyage",
    "travaux",
    "bureaux",
    "bureau",
    "accord",
    "recrutement",
    "fourniture",
    "prestataire",
    "etudes",
    "cabinet",
    "appel",
    "rehabilitation",
  ],
  pt: [
    "nao",
    "uma",
    "para",
    "dos",
    "das",
    "pelo",
    "pela",
    "formacao",
    "fornecimento",
    "atividade",
    "servicos",
  ],
  es: [
    "los",
    "las",
    "del",
    "una",
    "para",
    "con",
    "servicio",
    "convocatoria",
    "suministro",
  ],
  sw: ["katika", "huduma", "zabuni", "usafi", "manunuzi", "mwongozo"],
};

const SUPPORTED = new Set(Object.keys(LANGUAGE_WORDS).concat(["ar"]));

let quotaClosed = false;

export function resetTranslationQuota(): void {
  quotaClosed = false;
}

export function translationQuotaClosed(): boolean {
  return quotaClosed;
}

export function foldForLanguage(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

function wordHits(folded: string, words: string[]): number {
  let count = 0;
  for (const word of words) {
    const pattern = new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "g");
    const found = folded.match(pattern);
    if (found) count += found.length;
  }
  return count;
}

/** Returns a language code when the text is clearly not English. */
export function detectSourceLanguage(text: string): string | null {
  const raw = text.replace(/\s+/g, " ").trim();
  if (raw.length < 12) return null;
  const arabic = raw.match(/[\u0600-\u06FF]/g)?.length ?? 0;
  if (arabic >= 4) return "ar";

  const folded = foldForLanguage(raw);
  const scores = Object.entries(LANGUAGE_WORDS)
    .map(([lang, words]) => ({ lang, score: wordHits(folded, words) }))
    .sort((a, b) => b.score - a.score);
  const best = scores[0];
  const second = scores[1]?.score ?? 0;
  if (!best || best.score < 2 || best.score < second + 1) return null;
  return best.lang;
}

export function chunksForMyMemory(text: string, maxBytes = MAX_BYTES): string[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (Buffer.byteLength(clean) <= maxBytes) return [clean];
  const chunks: string[] = [];
  let current = "";
  for (const word of clean.split(" ")) {
    const next = current ? `${current} ${word}` : word;
    if (Buffer.byteLength(next) <= maxBytes) {
      current = next;
      continue;
    }
    if (current) chunks.push(current);
    current = Buffer.byteLength(word) <= maxBytes ? word : word.slice(0, 180);
  }
  if (current) chunks.push(current);
  return chunks;
}

export type EnglishReading = {
  matchTitle: string;
  matchDescription: string;
  titleEn: string | null;
  descriptionEn: string | null;
  sourceLang: string | null;
};

type CacheStore = {
  get(hash: string): Promise<string | null>;
  set(hash: string, lang: string, source: string, translated: string): Promise<void>;
};

export type TranslateOptions = {
  fetchImpl?: typeof fetch;
  contactEmail?: string;
  delayMs?: number;
  /** Live API calls still allowed. Cached chunks do not count. Shared across a sync. */
  budget?: { remaining: number };
};

function readingHash(lang: string, text: string): string {
  return createHash("sha256").update(`${lang}\n${text}`).digest("hex");
}

function contactEmail(override?: string): string {
  return (
    override?.trim() ||
    process.env.TRANSLATE_CONTACT_EMAIL?.trim() ||
    process.env.SEED_SUPER_ADMIN_EMAIL?.trim() ||
    ""
  );
}

function rejectedTranslation(text: string): boolean {
  return /MYMEMORY WARNING|QUERY LENGTH|INVALID LANGUAGE|EXAMPLE REQUEST/i.test(text);
}

function budgetClosed(options: TranslateOptions): boolean {
  return Boolean(options.budget && options.budget.remaining <= 0);
}

async function translateChunk(
  text: string,
  lang: string,
  options: TranslateOptions,
): Promise<string | null> {
  if (quotaClosed || budgetClosed(options)) return null;
  if (options.budget) options.budget.remaining -= 1;
  const url = new URL(MYMEMORY_URL);
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${lang}|en`);
  const email = contactEmail(options.contactEmail);
  if (email) url.searchParams.set("de", email);
  const fetchImpl = options.fetchImpl ?? fetch;
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as {
    quotaFinished?: boolean;
    responseStatus?: number;
    responseData?: { translatedText?: string };
  };
  if (body.quotaFinished) {
    quotaClosed = true;
    return null;
  }
  const translated = body.responseData?.translatedText?.replace(/\s+/g, " ").trim() ?? "";
  if (!translated || rejectedTranslation(translated) || body.responseStatus !== 200) {
    if (rejectedTranslation(translated) && /USED ALL AVAILABLE/i.test(translated)) {
      quotaClosed = true;
    }
    return null;
  }
  return translated;
}

async function translateText(
  text: string,
  lang: string,
  cache: CacheStore,
  options: TranslateOptions,
  maxChunks: number,
): Promise<string | null> {
  const chunks = chunksForMyMemory(text).slice(0, maxChunks);
  if (chunks.length === 0) return null;
  const parts: string[] = [];
  for (const chunk of chunks) {
    const hash = readingHash(lang, chunk);
    const cached = await cache.get(hash);
    if (cached) {
      parts.push(cached);
      continue;
    }
    if (quotaClosed || budgetClosed(options)) return parts.length > 0 ? parts.join(" ") : null;
    const translated = await translateChunk(chunk, lang, options);
    if (!translated) return parts.length > 0 ? parts.join(" ") : null;
    await cache.set(hash, lang, chunk, translated);
    parts.push(translated);
    const delay = options.delayMs ?? 200;
    if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const joined = parts.join(" ").replace(/\s+/g, " ").trim();
  return joined || null;
}

export async function englishReading(
  input: {
    title: string;
    description?: string | null;
    titleEn?: string | null;
    descriptionEn?: string | null;
    sourceLang?: string | null;
  },
  cache: CacheStore,
  options: TranslateOptions = {},
): Promise<EnglishReading> {
  const title = input.title.replace(/\s+/g, " ").trim();
  const description = (input.description ?? "").replace(/\s+/g, " ").trim();
  const sample = `${title} ${description.slice(0, 280)}`.trim();
  const lang = detectSourceLanguage(sample);
  if (!lang || !SUPPORTED.has(lang)) {
    return {
      matchTitle: title,
      matchDescription: description,
      titleEn: null,
      descriptionEn: null,
      sourceLang: null,
    };
  }

  const titleEn = await translateText(title, lang, cache, options, 2);
  if (!titleEn) {
    const keptTitle = input.titleEn?.trim() || "";
    return {
      matchTitle: keptTitle || title,
      matchDescription: input.descriptionEn?.trim() || description,
      titleEn: keptTitle || null,
      descriptionEn: input.descriptionEn?.trim() || null,
      sourceLang: keptTitle ? input.sourceLang ?? lang : null,
    };
  }

  const descriptionSlice = description.slice(0, DESCRIPTION_LIMIT);
  const descriptionEn = descriptionSlice
    ? await translateText(descriptionSlice, lang, cache, options, 2)
    : null;

  return {
    matchTitle: titleEn,
    matchDescription: descriptionEn || description,
    titleEn,
    descriptionEn,
    sourceLang: lang,
  };
}

export async function ensureEnglishReading(
  db: Db,
  input: {
    title: string;
    description?: string | null;
    titleEn?: string | null;
    descriptionEn?: string | null;
    sourceLang?: string | null;
  },
  options?: TranslateOptions,
): Promise<EnglishReading> {
  return englishReading(
    input,
    {
      async get(hash) {
        const [row] = await db
          .select({ translatedText: translationCache.translatedText })
          .from(translationCache)
          .where(eq(translationCache.sourceHash, hash))
          .limit(1);
        return row?.translatedText ?? null;
      },
      async set(hash, lang, source, translated) {
        await db
          .insert(translationCache)
          .values({
            sourceHash: hash,
            sourceLang: lang,
            sourceText: source,
            translatedText: translated,
          })
          .onConflictDoNothing({ target: translationCache.sourceHash });
      },
    },
    options,
  );
}
