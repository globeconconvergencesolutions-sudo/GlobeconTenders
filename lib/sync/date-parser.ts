const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

/** Parse tender closing dates from free text (Kenyan + ISO formats). */
export function parseClosingDate(text: string, fallback: Date): Date {
  const normalized = text.replace(/\u00a0/g, " ");

  const longMatch = normalized.match(
    /(?:closing|on or before|before|by)\s+(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})(?:\s+at\s+\d[\d:.]*\s*(?:am|pm)?)?/i,
  );
  if (longMatch) {
    const day = Number(longMatch[1]);
    const month = MONTHS[longMatch[2].toLowerCase()];
    const year = Number(longMatch[3]);
    if (month !== undefined) {
      const parsed = new Date(year, month, day, 23, 59, 59);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  const slashMatch = normalized.match(
    /(?:on or before|before|by|closing)\s+(\d{1,2})\/(\d{1,2})\/(\d{4})/i,
  );
  if (slashMatch) {
    const day = Number(slashMatch[1]);
    const month = Number(slashMatch[2]) - 1;
    const year = Number(slashMatch[3]);
    const parsed = new Date(year, month, day, 23, 59, 59);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const isoMatch = normalized.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) {
    const parsed = new Date(
      Number(isoMatch[1]),
      Number(isoMatch[2]) - 1,
      Number(isoMatch[3]),
      23,
      59,
      59,
    );
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const looseMatch = normalized.match(
    /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\s+(\d{4})/i,
  );
  if (looseMatch) {
    const day = Number(looseMatch[1]);
    const month = MONTHS[looseMatch[2].toLowerCase()];
    const year = Number(looseMatch[3]);
    if (month !== undefined) {
      const parsed = new Date(year, month, day, 23, 59, 59);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
  }

  return fallback;
}
