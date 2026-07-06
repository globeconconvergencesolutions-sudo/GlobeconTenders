import type { Country, Region, ServiceLine } from "@/lib/db/schema";

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

export function matchServiceLines(
  text: string,
  serviceLines: ServiceLine[],
): { serviceLineId: number; score: number; name: string }[] {
  const haystack = text.toLowerCase();
  const matches: { serviceLineId: number; score: number; name: string }[] = [];

  for (const line of serviceLines) {
    let score = 0;
    for (const keyword of line.keywords) {
      if (haystack.includes(keyword.toLowerCase())) {
        score += 10;
      }
    }
    if (score > 0) {
      matches.push({ serviceLineId: line.id, score, name: line.name });
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
