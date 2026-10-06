import assert from "node:assert/strict";
import test from "node:test";

import { keywordOccurs } from "@/lib/matching";
import { mergeMatchScores } from "@/lib/pis/catalog-match";
import { keywordsForLine } from "@/lib/pis/line-phrases";
import taxonomySeed from "@/lib/pis/taxonomy-seed.json";
import { applyRelevanceGate, resolveListingFields } from "@/lib/tenders/lifecycle";

type SeedLine = {
  fieldSlug: string;
  name: string;
  slug: string;
  keywords: string[];
};

const lines = (taxonomySeed as { serviceLines: SeedLine[] }).serviceLines;

function hits(text: string): string[] {
  return lines
    .filter((line) => keywordsForLine(line).some((keyword) => keywordOccurs(text, keyword)))
    .map((line) => line.slug);
}

test("every service line has a buyer phrase", () => {
  const empty = lines
    .filter((line) => keywordsForLine(line).length === 0)
    .map((line) => `${line.slug} (${line.name})`);
  assert.deepEqual(empty, []);
  assert.equal(lines.length, 425);
});

test("every market field has a line that can match", () => {
  const fields = new Set(lines.map((line) => line.fieldSlug));
  const covered = new Set(
    lines.filter((line) => keywordsForLine(line).length > 0).map((line) => line.fieldSlug),
  );
  const missing = [...fields].filter((slug) => !covered.has(slug));
  assert.deepEqual(missing, []);
  assert.equal(fields.size, 38);
});

test("cleaning notices land on cleaning lines", () => {
  const matched = hits("Provision of cleaning and fumigation services for the county offices");
  assert.ok(matched.includes("cleaning-services"));
  assert.ok(matched.includes("fumigation-and-pest-control"));
  assert.equal(matched.includes("custom-software-development"), false);
});

test("software notices stay off cleaning lines", () => {
  const matched = hits("Custom software development for a county revenue system");
  assert.ok(matched.includes("custom-software-development"));
  assert.equal(matched.includes("cleaning-services"), false);
  assert.equal(matched.includes("fumigation-and-pest-control"), false);
});

test("a bare management title does not match a market line", () => {
  const matched = hits("Management services for the secretariat");
  assert.deepEqual(matched, []);
});

test("stored works titles land on construction and laundry lines", () => {
  const laundry = hits("Proposed Construction of Modern Laundry at Kapsabet County Referral Hospital");
  assert.ok(laundry.includes("laundry-services"));
  assert.ok(laundry.includes("building-construction"));
  const works = hits("Construction Works for Installation of Automatic Weather Station");
  assert.ok(works.includes("building-construction"));
  const cleaning = hits("ACCORD A LONG TERME POUR ENTRETIEN ET NETTOYAGE DES BUREAUX");
  assert.ok(cleaning.includes("cleaning-services"));
});

test("a catalog phrase hit stays on the live list when the older score is zero", () => {
  const merged = mergeMatchScores(0, 0, 10);
  const listing = applyRelevanceGate(
    resolveListingFields({
      deadline: new Date("2026-12-01"),
      sourceStatus: "open",
      hasHardDeadline: true,
    }),
    merged.gateScore,
    10,
    { rawScore: merged.matchScore },
  );
  assert.equal(merged.matchScore, 10);
  assert.equal(listing.listingState, "live");
});
