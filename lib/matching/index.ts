import type { Country, Region, ServiceLine } from "@/lib/db/schema";
import { refineMatchScore } from "@/lib/matching/relevance";

export function detectRegionAndCountry(
  text: string,
  regions: Region[],
  countries: (Country & { regionSlug: string })[],
): {
  regionId?: number;
  countryId?: number;
  regionLabel?: string;
  countryLabel?: string;
} {
  const haystack = text.toUpperCase();

  for (const country of countries) {
    if (country.keywords.some((kw) => haystack.includes(kw.toUpperCase()))) {
      const region = regions.find((r) => r.id === country.regionId);
      return {
        countryId: country.id,
        regionId: country.regionId,
        countryLabel: country.name,
        regionLabel: region?.name,
      };
    }
  }

  for (const region of regions) {
    if (region.keywords.some((kw) => haystack.includes(kw.toUpperCase()))) {
      return {
        regionId: region.id,
        regionLabel: region.name,
      };
    }
  }

  return {};
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Whole-word / whole-phrase match (case-insensitive).
 * Prevents "LAN" matching "landscaping", "API" matching inside longer tokens,
 * and "procurement" matching "eProcurement".
 */
export function keywordOccurs(haystack: string, keyword: string): boolean {
  const raw = keyword.trim();
  if (!raw) return false;
  const pattern = escapeRegExp(raw).replace(/\s+/g, "\\s+");
  const re = new RegExp(`(?<![a-z0-9])${pattern}(?![a-z0-9])`, "i");
  return re.test(haystack);
}

export function matchServiceLines(
  text: string,
  serviceLines: ServiceLine[],
): { serviceLineId: number; score: number; name: string }[] {
  const matches: { serviceLineId: number; score: number; name: string }[] = [];

  for (const line of serviceLines) {
    let score = 0;
    for (const keyword of line.keywords) {
      if (keywordOccurs(text, keyword)) {
        score += 10;
      }
    }
    if (score > 0) {
      matches.push({ serviceLineId: line.id, score, name: line.name });
    }
  }

  const ranked = matches.sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return ranked;

  const top = ranked[0];
  const refined = refineMatchScore(top.score, text);
  if (refined <= 0) return [];

  return ranked.map((row, index) =>
    index === 0 ? { ...row, score: refined } : row,
  );
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
