/**
 * Extra relevance signals beyond service-line keywords.
 * Demotes civil/goods noise that still trips a single soft keyword (e.g. "capacity building").
 */

const CIVIL_OR_GOODS_NOISE =
  /\b(ESIA|environmental and social impact|feasibility study|detailed design for (road|highway|bridge)|cabro|landscaping|turf(?:ing)?|drainage works|civil works|construction of|reroofing|levelling|prequalification of suppliers|supply[, ]+delivery(?!.{0,40}(software|system|digital|ICT|cloud))|processing equipment|goods and services\b.{0,40}prequalification)\b/i;

const STRONG_TECH =
  /\b(software|digital(?:isation|ization)?|digitisation|digitization|ICT|information system|management information|e-?procurement|cloud (?:hosting|computing|migration|services)|cyber(?:\s|-)?secur(?:ity|e)|database|data migration|ERP|MIS|web application|mobile (?:app|application)|API\b|system (?:development|integration|implementation)|electronic document|GED\b|SD-?WAN|local area network|wide area network|IT infrastructure|business intelligence|Power BI|ISO 27001|penetration test)\b/i;

export type RefineResult = {
  /** Score used for the Live pass gate (may be 0 after demotion). */
  score: number;
  /** Pre-demotion keyword score (kept for Needs review ranking). */
  rawScore: number;
  /** Why it did not auto-pass Live, when applicable. */
  reason: string | null;
};

/**
 * Adjust match score after keyword scoring.
 * - Civil/goods noise without a strong tech signal → demote (review)
 * - Single soft keyword hit without a strong tech phrase → demote (review)
 */
export function refineMatchScore(
  rawScore: number,
  text: string,
): RefineResult {
  if (rawScore <= 0) {
    return { score: 0, rawScore: 0, reason: "No service-line keyword match" };
  }
  const noisy = CIVIL_OR_GOODS_NOISE.test(text);
  const tech = STRONG_TECH.test(text);
  if (noisy && !tech) {
    return {
      score: 0,
      rawScore,
      reason: "Looks like civil/goods work without a clear tech signal",
    };
  }
  if (rawScore < 20 && !tech) {
    return {
      score: 0,
      rawScore,
      reason: "Only a weak keyword hit — needs a stronger tech signal",
    };
  }
  return { score: rawScore, rawScore, reason: null };
}
