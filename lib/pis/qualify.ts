import { and, desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db";
import {
  capabilityGaps,
  companyCapabilities,
  companyCertifications,
  companyPersonnel,
  companyProfiles,
  companyProjects,
  evidenceDocuments,
  opportunityRequirements,
  qualificationAssessments,
  sources,
  tenders,
} from "@/lib/db/schema";
import { scoreCatalogText } from "./catalog-match";
import { matchHaystack } from "./translate";
import {
  extractRequirementLines,
  gapTypeFor,
  judgeRequirement,
  scanDepth,
  sourceForLine,
  summarizeQualification,
  type RequirementStatus,
} from "./decisions";
import { readEvidenceSnippets, readStoredNotice } from "./documents";
import { isModelConfigured, suggestRequirementLines } from "./model";

type Db = NonNullable<ReturnType<typeof getDb>>;

export type { OverallStatus, RecommendedAction, RequirementStatus } from "./decisions";

function evidenceBlob(parts: string[]): string {
  return parts.filter(Boolean).join("\n");
}

/**
 * Rules assessment. Scores are null when the inputs do not support a number.
 * Missing documents stay UNVERIFIED. They are not treated as missing capability.
 */
export async function assessOpportunity(db: Db, orgId: number, tenderId: number) {
  const [tender] = await db
    .select()
    .from(tenders)
    .where(and(eq(tenders.id, tenderId), eq(tenders.orgId, orgId)))
    .limit(1);
  if (!tender) throw new Error("Opportunity not found");

  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, tender.sourceId))
    .limit(1);

  const [profile] = await db
    .select()
    .from(companyProfiles)
    .where(eq(companyProfiles.orgId, orgId))
    .limit(1);

  const [capabilities, projects, personnel, certifications, evidence] =
    await Promise.all([
      db
        .select()
        .from(companyCapabilities)
        .where(eq(companyCapabilities.orgId, orgId)),
      db.select().from(companyProjects).where(eq(companyProjects.orgId, orgId)),
      db
        .select()
        .from(companyPersonnel)
        .where(eq(companyPersonnel.orgId, orgId)),
      db
        .select()
        .from(companyCertifications)
        .where(eq(companyCertifications.orgId, orgId)),
      db
        .select()
        .from(evidenceDocuments)
        .where(eq(evidenceDocuments.orgId, orgId)),
    ]);

  const description = tender.description?.trim() ?? "";
  const notice = await readStoredNotice(tender.documentUrls ?? []);
  const evidenceText = await readEvidenceSnippets(
    evidence.map((row) => row.url).filter((url): url is string => Boolean(url)),
  );
  const depth = scanDepth({ description, documentText: notice.text });
  const combined = [description, notice.text ?? ""].filter(Boolean).join("\n");
  const lines = extractRequirementLines(combined);
  const profileText = evidenceBlob([
    profile?.description ?? "",
    profile?.legalName ?? "",
    ...capabilities.map((row) => `${row.name} ${row.description ?? ""}`),
    ...projects.map((row) => `${row.name} ${row.scope ?? ""} ${row.client ?? ""}`),
    ...personnel.map(
      (row) => `${row.position ?? ""} ${row.discipline ?? ""} ${row.certifications ?? ""}`,
    ),
    ...certifications.map((row) => row.name),
    ...evidence.map((row) => `${row.name} ${row.documentType}`),
    evidenceText,
  ]);
  const hasProfile = Boolean(profile?.legalName || profile?.description || capabilities.length);

  const catalogHits = await scoreCatalogText(
    db,
    matchHaystack(tender),
  );
  const relevanceScore =
    catalogHits.length > 0
      ? Math.min(
          100,
          catalogHits.reduce((sum, hit) => sum + hit.score, 0),
        )
      : tender.matchScore > 0
        ? Math.min(100, tender.matchScore)
        : null;

  await db
    .delete(opportunityRequirements)
    .where(
      and(
        eq(opportunityRequirements.tenderId, tenderId),
        eq(opportunityRequirements.orgId, orgId),
      ),
    );

  const requirementRows = lines.map((line) => judgeRequirement(line, profileText, hasProfile));

  if (requirementRows.length > 0) {
    await db.insert(opportunityRequirements).values(
      requirementRows.map((row) => {
        const source = sourceForLine(row.description, description, notice.text, notice.ref);
        return {
          tenderId,
          orgId,
          description: row.description,
          category: row.category,
          mandatory: row.mandatory,
          sourceKind: source.sourceKind,
          sourceRef: source.sourceRef,
          status: row.status,
          evidenceNote: row.evidenceNote,
          reviewState: "accepted",
        };
      }),
    );
  }

  const summary = summarizeQualification({
    hasProfile,
    rows: requirementRows,
    description: combined,
  });
  const met = requirementRows.filter((row) => row.status === "MEETS");
  const qualificationScore = summary.qualificationScore;

  const evidenceConfidence =
    evidence.length === 0 || requirementRows.length === 0
      ? null
      : Math.round((met.length / requirementRows.length) * 100);

  const deadlineUrgency = describeDeadline(tender.deadline, tender.hasHardDeadline);
  const sourceConfidence = describeSource(source?.adapter, source?.lastSyncStatus);

  let modelNote = "";
  if (isModelConfigured()) {
    try {
      const suggestions = await suggestRequirementLines(combined);
      if (suggestions.length > 0) {
        await db.insert(opportunityRequirements).values(
          suggestions.map((line) => ({
            tenderId,
            orgId,
            description: line,
            category: "technical",
            mandatory: /\b(must|shall|required)\b/i.test(line),
            sourceKind: "model",
            sourceRef: "Model suggestion awaiting acceptance",
            status: "UNVERIFIED" as const,
            evidenceNote:
              "Suggested by a model. Not scored and not marked verified until someone accepts it and the assessment is run again.",
            reviewState: "pending",
          })),
        );
        modelNote =
          " A model suggested extra lines. They stay out of the score until someone accepts them.";
      }
    } catch {
      modelNote = " A model is configured but did not return requirements. The score uses rules.";
    }
  }

  const whyMatch =
    catalogHits.length > 0
      ? `Keyword method. Matched ${catalogHits
          .slice(0, 5)
          .map((hit) => `${hit.name} (${hit.hits.join(", ")})`)
          .join("; ")}. Relevance is 10 points per whole-word hit, capped at 100.`
      : tender.matchScore > 0
        ? `No curated catalog hits. Fell back to the existing service-line score of ${tender.matchScore} (10 points per hit, capped at 100).`
        : "No curated keyword hit and no service-line score. Relevance is not shown as a percentage.";

  const [assessment] = await db
    .insert(qualificationAssessments)
    .values({
      tenderId,
      orgId,
      method: "rules",
      deepScanStatus: depth.deepScanStatus,
      overallStatus: summary.overall,
      recommendedAction: summary.action,
      relevanceScore,
      qualificationScore,
      evidenceConfidence,
      deadlineUrgency,
      sourceConfidence,
      explanation: `${whyMatch} Method: rules.${modelNote} This is a preliminary assessment, not the procuring entity's eligibility decision.`,
      mismatchExplanation: summary.mismatchExplanation,
    })
    .returning();

  await db
    .delete(capabilityGaps)
    .where(and(eq(capabilityGaps.orgId, orgId), eq(capabilityGaps.tenderId, tenderId)));

  const gaps = requirementRows
    .filter(
      (row) =>
        row.status === "UNVERIFIED" ||
        row.status === "PARTIAL" ||
        row.status === "DOES NOT MEET",
    )
    .slice(0, 12)
    .map((row) => ({
      orgId,
      tenderId,
      gapType: gapTypeFor(row.category, row.status as RequirementStatus),
      description: row.description.slice(0, 500),
      status: row.status === "DOES NOT MEET" ? "confirmed" : "evidence-related",
      correctiveAction:
        row.status === "DOES NOT MEET"
          ? "Do not treat this as bid-ready until a reviewer confirms the failed mandatory statement."
          : "Add the supporting document or project record, then reassess. Absence of a file is not absence of capability.",
    }));

  if (!hasProfile) {
    gaps.unshift({
      orgId,
      tenderId,
      gapType: "documentation",
      description: "Company profile has no legal name, description, or capabilities.",
      status: "evidence-related",
      correctiveAction: "Complete Company Intelligence before treating qualification as known.",
    });
  }

  if (gaps.length > 0) {
    await db.insert(capabilityGaps).values(gaps);
  }

  return assessment;
}

export async function latestAssessment(db: Db, orgId: number, tenderId: number) {
  const [row] = await db
    .select()
    .from(qualificationAssessments)
    .where(
      and(
        eq(qualificationAssessments.orgId, orgId),
        eq(qualificationAssessments.tenderId, tenderId),
      ),
    )
    .orderBy(desc(qualificationAssessments.assessedAt))
    .limit(1);
  return row ?? null;
}

function describeDeadline(deadline: Date, hasHardDeadline: boolean): string {
  if (!hasHardDeadline) return "No fixed deadline on the notice";
  const days = Math.ceil((deadline.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  if (days < 0) return `Closed ${Math.abs(days)} day(s) ago`;
  if (days <= 3) return `${days} day(s) — critical`;
  if (days <= 7) return `${days} day(s) — high`;
  if (days <= 30) return `${days} day(s) — medium`;
  return `${days} day(s) — low`;
}

function describeSource(adapter?: string | null, lastStatus?: string | null): string {
  if (lastStatus && lastStatus !== "success" && lastStatus !== "partial") return "Low";
  if (adapter === "document" || adapter === "generic-link") return "Low";
  if (adapter === "generic-rss") return "Medium";
  if (
    adapter === "world-bank" ||
    adapter === "tender-yetu" ||
    adapter === "kenya-ppip" ||
    adapter === "afdb-procurement"
  ) {
    return "High";
  }
  return "Unknown";
}

export function readinessSections(input: {
  profile: {
    legalName: string | null;
    description: string | null;
    country: string | null;
    website: string | null;
  } | null;
  capabilities: number;
  projects: number;
  personnel: number;
  certifications: number;
  evidence: number;
  expiring: number;
}) {
  const checks = [
    { key: "Company information", done: Boolean(input.profile?.legalName && input.profile.description) },
    { key: "Country and website", done: Boolean(input.profile?.country && input.profile.website) },
    { key: "Capabilities", done: input.capabilities > 0 },
    { key: "Projects", done: input.projects > 0 },
    { key: "Personnel", done: input.personnel > 0 },
    { key: "Certifications", done: input.certifications > 0 },
    { key: "Evidence documents", done: input.evidence > 0 },
  ];
  const done = checks.filter((item) => item.done).length;
  return {
    checks,
    expiring: input.expiring,
    complete: done,
    total: checks.length,
    note: "Profile completeness is not a qualification result.",
  };
}
