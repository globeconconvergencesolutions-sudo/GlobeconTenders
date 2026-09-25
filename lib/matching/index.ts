import type { Country, Region, ServiceLine } from "@/lib/db/schema";
import { refineMatchScore, type RefineResult } from "@/lib/matching/relevance";

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

export type ServiceLineMatch = {
  serviceLineId: number;
  score: number;
  name: string;
};

export type OpportunityScore = {
  matches: ServiceLineMatch[];
  /** Refined score used for the Live gate. */
  topScore: number;
  /** Raw keyword score before demotion (for Needs review). */
  rawTopScore: number;
  reason: string | null;
  refine: RefineResult;
};

/** Score text against service lines (raw + refined). */
export function scoreOpportunity(
  text: string,
  serviceLines: ServiceLine[],
): OpportunityScore {
  const matches: ServiceLineMatch[] = [];

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
  const rawTopScore = ranked[0]?.score ?? 0;
  const refine = refineMatchScore(rawTopScore, text);

  return {
    matches: ranked,
    topScore: refine.score,
    rawTopScore,
    reason: refine.reason,
    refine,
  };
}

/** @deprecated Prefer scoreOpportunity — kept for transitional callers. */
export function matchServiceLines(
  text: string,
  serviceLines: ServiceLine[],
): ServiceLineMatch[] {
  const scored = scoreOpportunity(text, serviceLines);
  if (scored.topScore <= 0) return [];
  return scored.matches.map((row, index) =>
    index === 0 ? { ...row, score: scored.topScore } : row,
  );
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
