/**
 * Controlled notice-type labels — map noisy portal categories into a short list.
 * Unknown values keep a cleaned title-case form rather than inventing intent.
 */

export const NOTICE_CATEGORIES = [
  "Goods",
  "Works",
  "Services",
  "Consultancy",
  "Job posting",
  "Supply",
  "Other",
] as const;

export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number];

function titleCase(value: string): string {
  return value
    .split(/[\s_/|-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ")
    .slice(0, 80);
}

export function normalizeCategory(
  raw: string | null | undefined,
  hints?: { title?: string; description?: string },
): string {
  const haystack = `${raw ?? ""} ${hints?.title ?? ""} ${hints?.description ?? ""}`
    .toLowerCase()
    .trim();

  if (!haystack) return "Other";

  if (
    /\b(consult|advisory|technical assistance|tor\b|terms of reference)\b/.test(
      haystack,
    )
  ) {
    return "Consultancy";
  }
  if (
    /\b(works|construction|civil|epc|infrastructure|renovation|building)\b/.test(
      haystack,
    )
  ) {
    return "Works";
  }
  if (
    /\b(goods|equipment|vehicles?|machinery|hardware|furniture)\b/.test(haystack)
  ) {
    return "Goods";
  }
  if (/\b(supply|supplies|procurement of)\b/.test(haystack)) {
    return "Supply";
  }
  if (
    /\b(job|vacanc|recruit|human resource|\bhr\b|career|employment|hiring)\b/.test(
      haystack,
    )
  ) {
    return "Job posting";
  }
  if (
    /\b(services?|maintenance|support|management|cleaning|security|ict)\b/.test(
      haystack,
    )
  ) {
    return "Services";
  }

  const cleaned = titleCase((raw ?? "").trim());
  return cleaned || "Other";
}
