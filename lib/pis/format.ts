const WHEN = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const DAY = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatWhen(value: Date | string | null | undefined): string {
  if (!value) return "Unknown";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "Unknown";
  return WHEN.format(date);
}

export function formatDay(value: Date | string | null | undefined): string {
  if (!value) return "Unknown";
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return String(value);
  return DAY.format(date);
}

const STATUS_LABELS: Record<string, string> = {
  MEETS: "Meets",
  PARTIAL: "Partial",
  "DOES NOT MEET": "Does not meet",
  UNVERIFIED: "Unverified",
  "NOT APPLICABLE": "Not applicable",
  "INSUFFICIENT INFORMATION": "Insufficient information",
  "QUALIFICATION APPEARS SATISFIED": "Appears satisfied",
  "PARTIALLY SATISFIED": "Partially satisfied",
  "QUALIFICATION UNCERTAIN": "Uncertain",
  "REQUIREMENTS NOT SATISFIED": "Not satisfied",
  "BID DIRECTLY": "Bid directly",
  "CLARIFICATION REQUIRED": "Clarification required",
  "BID WITH PARTNER/JV": "Bid with a partner",
  "REVIEW REQUIRED": "Review required",
  "DO NOT PURSUE": "Do not pursue",
  self_declared: "Self-declared",
  unverified: "Unverified",
  verified: "Verified",
  internal: "Internal",
  restricted: "Restricted",
  finance: "Finance",
  active: "Active",
  candidate: "Candidate",
  proposed: "Proposed",
  confirmed: "Confirmed",
  dismissed: "Dismissed",
  success: "Success",
  incomplete: "Incomplete",
  description_only: "Description only",
  documents_read: "Documents read",
  metadata: "Notice text",
  description: "Notice description",
  document: "Stored document",
  model: "Model suggestion",
  rules: "Rules",
};

export function statusLabel(value: string | null | undefined): string {
  if (!value) return "Unknown";
  return STATUS_LABELS[value] ?? value.replaceAll("_", " ");
}

const STAGE_LABEL: Record<string, string> = {
  DISCOVERED: "Discovered",
  REVIEWING: "Reviewing",
  QUALIFICATION_CHECK: "Qualification check",
  SHORTLISTED: "Shortlisted",
  BID_NO_BID: "Bid or no bid",
  PREPARING: "Preparing",
  SUBMITTED: "Submitted",
  AWARDED: "Awarded",
  UNSUCCESSFUL: "Unsuccessful",
  CANCELLED: "Cancelled",
  ARCHIVED: "Archived",
};

export function stageLabel(stage: string | null | undefined): string {
  if (!stage) return "Not accepted yet";
  return STAGE_LABEL[stage] ?? stage.replaceAll("_", " ");
}

export function toneForStatus(status: string): "ready" | "missing" | "calm" | "bad" | "info" {
  const value = status.toLowerCase();
  if (
    value.includes("meet") &&
    !value.includes("not") &&
    !value.includes("does not") &&
    value !== "partial"
  ) {
    return "ready";
  }
  if (value === "meets" || value === "verified" || value === "success" || value === "ready") {
    return "ready";
  }
  if (
    value.includes("does not") ||
    value.includes("not satisfied") ||
    value.includes("do not") ||
    value === "failed"
  ) {
    return "bad";
  }
  if (value.includes("partial") || value.includes("missing") || value.includes("expir")) {
    return "missing";
  }
  if (value.includes("insufficient") || value.includes("unverified") || value.includes("uncertain")) {
    return "missing";
  }
  return "calm";
}

export function verificationLabel(value: string | null | undefined): string {
  return statusLabel(value);
}
