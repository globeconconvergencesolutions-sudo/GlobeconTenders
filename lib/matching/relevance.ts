/**
 * Extra relevance signals beyond service-line keywords.
 * Demotes civil/goods noise that still trips a single soft keyword (e.g. "capacity building").
 */

const CIVIL_OR_GOODS_NOISE =
  /\b(ESIA|environmental and social impact|feasibility study|detailed design for (road|highway|bridge)|cabro|landscaping|turf(?:ing)?|drainage works|civil works|construction of|reroofing|levelling|prequalification of suppliers|supply[, ]+delivery(?!.{0,40}(software|system|digital|ICT|cloud))|processing equipment|goods and services\b.{0,40}prequalification)\b/i;

const STRONG_TECH =
  /\b(software|digital(?:isation|ization)?|digitisation|digitization|ICT|information system|management information|e-?procurement|cloud (?:hosting|computing|migration|services)|cyber(?:\s|-)?secur(?:ity|e)|database|data migration|ERP|MIS|web application|mobile (?:app|application)|API\b|system (?:development|integration|implementation)|electronic document|GED\b|SD-?WAN|local area network|wide area network|IT infrastructure|business intelligence|Power BI|ISO 27001|penetration test)\b/i;

/**
 * Adjust match score after keyword scoring.
 * - Civil/goods noise without a strong tech signal → 0
 * - Single soft keyword hit without a strong tech phrase → 0
 */
export function refineMatchScore(
  rawScore: number,
  text: string,
): number {
  if (rawScore <= 0) return 0;
  const hay = text;
  const noisy = CIVIL_OR_GOODS_NOISE.test(hay);
  const tech = STRONG_TECH.test(hay);
  if (noisy && !tech) return 0;
  // One keyword hit is only trusted when the notice also reads as tech work.
  if (rawScore < 20 && !tech) return 0;
  return rawScore;
}
