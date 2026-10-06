import { keywordOccurs } from "@/lib/matching";

export type RequirementStatus =
  | "MEETS"
  | "PARTIAL"
  | "DOES NOT MEET"
  | "UNVERIFIED"
  | "NOT APPLICABLE";

export type OverallStatus =
  | "QUALIFICATION APPEARS SATISFIED"
  | "PARTIALLY SATISFIED"
  | "QUALIFICATION UNCERTAIN"
  | "REQUIREMENTS NOT SATISFIED"
  | "INSUFFICIENT INFORMATION";

export type RecommendedAction =
  | "BID DIRECTLY"
  | "CLARIFICATION REQUIRED"
  | "BID WITH PARTNER/JV"
  | "REVIEW REQUIRED"
  | "DO NOT PURSUE"
  | "INSUFFICIENT INFORMATION";

const REQUIREMENT_CUES =
  /\b(must|shall|required|minimum|at least|years of|certified|certificate|turnover|bid security|eligibility)\b/i;

const NEGATION =
  /\b(do not|does not|cannot|can't|not certified|no valid|not hold|does not hold|do not hold)\b/i;

export function extractRequirementLines(description: string): string[] {
  return description
    .split(/\n+|(?<=\.)\s+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 40 && REQUIREMENT_CUES.test(line))
    .slice(0, 25);
}

export function categoryFor(line: string): string {
  const text = line.toLowerCase();
  if (/certificate|licen[cs]e|iso|tax/.test(text)) return "compliance";
  if (/turnover|financial|audited|bid security/.test(text)) return "financial";
  if (/personnel|expert|years of|staff|cv/.test(text)) return "personnel";
  if (/experience|similar assignment|reference/.test(text)) return "experience";
  return "technical";
}

export function keywordOverlap(profileText: string, requirement: string): number {
  const tokens = requirement
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 5);
  const unique = [...new Set(tokens)].slice(0, 12);
  let hits = 0;
  for (const token of unique) {
    if (keywordOccurs(profileText, token)) hits += 1;
  }
  return hits;
}

export function contradictsRequirement(profileText: string, requirement: string): boolean {
  const sentences = profileText.split(/[\n.]/);
  for (const sentence of sentences) {
    if (!NEGATION.test(sentence)) continue;
    if (keywordOverlap(sentence, requirement) >= 2) return true;
  }
  return false;
}

export type JudgedRequirement = {
  description: string;
  category: string;
  mandatory: boolean;
  status: RequirementStatus;
  evidenceNote: string;
};

export function judgeRequirement(
  line: string,
  profileText: string,
  hasProfile: boolean,
): JudgedRequirement {
  const mandatory = /\b(must|shall|mandatory|required)\b/i.test(line);
  const category = categoryFor(line);
  if (!hasProfile) {
    return {
      description: line,
      category,
      mandatory,
      status: "UNVERIFIED",
      evidenceNote:
        "Company profile is empty. Missing evidence is not treated as missing capability.",
    };
  }
  if (contradictsRequirement(profileText, line)) {
    return {
      description: line,
      category,
      mandatory,
      status: "DOES NOT MEET",
      evidenceNote:
        "Profile text contradicts this statement. Relevance does not override a failed mandatory requirement.",
    };
  }
  const hits = keywordOverlap(profileText, line);
  if (hits >= 2) {
    return {
      description: line,
      category,
      mandatory,
      status: "MEETS",
      evidenceNote:
        "Profile, project, personnel, or evidence text shares terms with this statement. Self-declared unless a record is marked verified.",
    };
  }
  if (hits === 1) {
    return {
      description: line,
      category,
      mandatory,
      status: "PARTIAL",
      evidenceNote:
        "Only part of the statement appears in the profile. This is a partial match, not a confirmed pass.",
    };
  }
  if (category === "financial" && !/turnover|audited|financial/i.test(profileText)) {
    return {
      description: line,
      category,
      mandatory,
      status: "UNVERIFIED",
      evidenceNote: "Financial threshold is stated and no financial evidence is on file.",
    };
  }
  return {
    description: line,
    category,
    mandatory,
    status: "UNVERIFIED",
    evidenceNote:
      "The profile does not document this statement. Recorded as an evidence gap, not a confirmed capability gap.",
  };
}

export function summarizeQualification(input: {
  hasProfile: boolean;
  rows: Array<{ mandatory: boolean; status: RequirementStatus }>;
  description: string;
}): {
  overall: OverallStatus;
  action: RecommendedAction;
  qualificationScore: number | null;
  mismatchExplanation: string;
} {
  const rows = input.rows;
  const mandatoryFails = rows.filter(
    (row) => row.mandatory && row.status === "DOES NOT MEET",
  );
  const met = rows.filter((row) => row.status === "MEETS");
  const partial = rows.filter((row) => row.status === "PARTIAL");

  let overall: OverallStatus = "INSUFFICIENT INFORMATION";
  if (!input.hasProfile || rows.length === 0) {
    overall = "INSUFFICIENT INFORMATION";
  } else if (mandatoryFails.length > 0) {
    overall = "REQUIREMENTS NOT SATISFIED";
  } else if (met.length === rows.length) {
    overall = "QUALIFICATION APPEARS SATISFIED";
  } else if (met.length > 0 || partial.length > 0) {
    overall = "PARTIALLY SATISFIED";
  } else {
    overall = "QUALIFICATION UNCERTAIN";
  }

  const qualificationScore =
    overall === "INSUFFICIENT INFORMATION" || rows.length === 0
      ? null
      : Math.round((met.length / rows.length) * 100);

  let action: RecommendedAction = "INSUFFICIENT INFORMATION";
  if (overall === "INSUFFICIENT INFORMATION") action = "INSUFFICIENT INFORMATION";
  else if (overall === "REQUIREMENTS NOT SATISFIED") action = "DO NOT PURSUE";
  else if (/\b(to be confirmed|tbd|clarification)\b/i.test(input.description))
    action = "CLARIFICATION REQUIRED";
  else if (overall === "QUALIFICATION APPEARS SATISFIED") action = "BID DIRECTLY";
  else if (/joint venture|consortium|partner/i.test(input.description) && met.length > 0)
    action = "BID WITH PARTNER/JV";
  else action = "REVIEW REQUIRED";

  const mismatchExplanation =
    rows.length === 0
      ? "The notice text does not contain extractable requirement statements. Deep scan is incomplete, so qualification is not scored."
      : mandatoryFails.length > 0
        ? "A mandatory statement was marked DOES NOT MEET. Relevance cannot override that."
        : "Unverified statements are evidence gaps. They are not confirmed capability gaps.";

  return { overall, action, qualificationScore, mismatchExplanation };
}

export function scanDepth(input: {
  description: string;
  documentText: string | null;
}): {
  deepScanStatus: "incomplete" | "description_only" | "documents_read";
  sourceKind: "metadata" | "description" | "document";
  sourceRef: string;
} {
  if (input.documentText && input.documentText.trim().length > 40) {
    return {
      deepScanStatus: "documents_read",
      sourceKind: "document",
      sourceRef: "Stored notice document",
    };
  }
  if (input.description.trim().length >= 400) {
    return {
      deepScanStatus: "description_only",
      sourceKind: "description",
      sourceRef: "Notice description",
    };
  }
  return {
    deepScanStatus: "incomplete",
    sourceKind: "metadata",
    sourceRef: "Preliminary metadata only — full document was not available",
  };
}

export function sourceForLine(
  line: string,
  description: string,
  documentText: string | null,
  documentRef: string | null,
): { sourceKind: string; sourceRef: string } {
  const probe = line.slice(0, 48);
  if (documentText && documentText.includes(probe)) {
    return {
      sourceKind: "document",
      sourceRef: documentRef ?? "Stored notice document",
    };
  }
  if (description.length >= 400 && description.includes(probe)) {
    return { sourceKind: "description", sourceRef: "Notice description" };
  }
  return {
    sourceKind: "metadata",
    sourceRef: "Preliminary metadata only — full document was not available",
  };
}

export function deadlineHistoryNote(
  previous: string | null,
  next: string | null,
): string {
  if (previous && next && previous !== next) {
    return `Closing date changed from ${previous} to ${next}. The earlier date stays in history.`;
  }
  return "No conflicting deadline is recorded.";
}

export function gapTypeFor(category: string, status: RequirementStatus): string {
  if (status === "UNVERIFIED" || status === "PARTIAL") return "documentation";
  if (category === "financial") return "financial";
  if (category === "personnel") return "personnel";
  if (category === "experience") return "experience";
  if (category === "compliance") return "certification";
  return "capability";
}

export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function isDuplicateCandidate(
  left: { id: number; sourceId: number; title: string; buyer: string | null; deadline: Date; referenceId: string },
  right: { id: number; sourceId: number; title: string; buyer: string | null; deadline: Date; referenceId: string },
): boolean {
  if (left.id === right.id || left.sourceId === right.sourceId) return false;
  if (left.referenceId && left.referenceId === right.referenceId) return true;
  const sameTitle = normalizeTitle(left.title) === normalizeTitle(right.title);
  const sameBuyer = Boolean(
    left.buyer &&
      right.buyer &&
      left.buyer.trim().toLowerCase() === right.buyer.trim().toLowerCase(),
  );
  const sameDay =
    left.deadline.toISOString().slice(0, 10) === right.deadline.toISOString().slice(0, 10);
  return sameTitle && sameBuyer && sameDay;
}

export function orderedPair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}
