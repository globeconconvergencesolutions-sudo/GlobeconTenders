import assert from "node:assert/strict";
import test from "node:test";

import {
  chunksForMyMemory,
  detectSourceLanguage,
  englishReading,
  matchHaystack,
  resetTranslationQuota,
} from "./translate";

test("English notices are not sent for translation", async () => {
  let called = 0;
  const reading = await englishReading(
    { title: "Provision of cleaning and fumigation services for the county offices" },
    {
      async get() {
        return null;
      },
      async set() {
        called += 1;
      },
    },
    {
      fetchImpl: async () => {
        called += 1;
        throw new Error("English text must not be translated");
      },
    },
  );
  assert.equal(reading.sourceLang, null);
  assert.equal(reading.titleEn, null);
  assert.equal(called, 0);
});

test("a French cleaning title is translated once and then read from cache", async () => {
  resetTranslationQuota();
  const stored = new Map<string, string>();
  let calls = 0;
  const fetchImpl: typeof fetch = async () => {
    calls += 1;
    return new Response(
      JSON.stringify({
        responseStatus: 200,
        quotaFinished: false,
        responseData: { translatedText: "Long-term agreement for office cleaning" },
      }),
      { status: 200 },
    );
  };
  const cache = {
    async get(hash: string) {
      return stored.get(hash) ?? null;
    },
    async set(hash: string, _lang: string, _source: string, translated: string) {
      stored.set(hash, translated);
    },
  };
  const title = "ACCORD A LONG TERME POUR ENTRETIEN ET NETTOYAGE DES BUREAUX";
  const first = await englishReading({ title }, cache, { fetchImpl, delayMs: 0 });
  const second = await englishReading({ title }, cache, { fetchImpl, delayMs: 0 });
  assert.equal(detectSourceLanguage(title), "fr");
  assert.equal(first.titleEn, "Long-term agreement for office cleaning");
  assert.equal(first.matchTitle, first.titleEn);
  assert.equal(second.titleEn, first.titleEn);
  assert.equal(calls, 1);
});

test("a quota warning is not stored as a translation", async () => {
  resetTranslationQuota();
  const reading = await englishReading(
    { title: "ACCORD A LONG TERME POUR ENTRETIEN ET NETTOYAGE DES BUREAUX" },
    {
      async get() {
        return null;
      },
      async set() {
        throw new Error("warning must not be cached");
      },
    },
    {
      delayMs: 0,
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            responseStatus: 200,
            quotaFinished: true,
            responseData: {
              translatedText: "MYMEMORY WARNING: YOU USED ALL AVAILABLE FREE TRANSLATIONS FOR TODAY",
            },
          }),
          { status: 200 },
        ),
    },
  );
  assert.equal(reading.titleEn, null);
  assert.equal(reading.matchTitle.includes("NETTOYAGE"), true);
});

test("Portuguese and Arabic are recognized, and a bare English title is not", () => {
  assert.equal(
    detectSourceLanguage("Formação Especializada em Atividade Bancária para o Sistema"),
    "pt",
  );
  assert.equal(detectSourceLanguage("توريد خدمات النظافة للمكاتب الحكومية في نيروبي"), "ar");
  assert.equal(detectSourceLanguage("Proposed Construction of Modern Laundry"), null);
});

test("matching prefers the English reading", () => {
  const text = matchHaystack({
    title: "ACCORD POUR NETTOYAGE DES BUREAUX",
    titleEn: "Agreement for office cleaning",
    description: "Entretien des bureaux",
    descriptionEn: "Office cleaning services",
    category: "services",
  });
  assert.match(text, /office cleaning/i);
  assert.equal(text.includes("NETTOYAGE"), false);
});

test("long text is split under the free request limit", () => {
  const chunks = chunksForMyMemory(`${"nettoyage ".repeat(80)}`);
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(Buffer.byteLength(chunk) <= 450);
  }
});
