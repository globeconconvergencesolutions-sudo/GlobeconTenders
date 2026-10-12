import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq, or } from "drizzle-orm";

import {
  AcceptRequirementButton,
  NoteForm,
} from "@/components/pis/actions";
import { AssessButton } from "@/components/pis/assess-button";
import { EmptyState, PageShell, SectionCard, StatusPill } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  bidPipeline,
  capabilityGaps,
  catalogServiceLines,
  opportunityNotes,
  opportunityRelations,
  opportunityRequirements,
  opportunityVersions,
  pipelineActivity,
  qualificationAssessments,
  sources,
  tenderCatalogMatches,
  tenders,
  users,
} from "@/lib/db/schema";
import { deadlineHistoryNote } from "@/lib/pis/decisions";
import { formatWhen, stageLabel, statusLabel, toneForStatus } from "@/lib/pis/format";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";
import { latestAssessment } from "@/lib/pis/qualify";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function OpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  const { id } = await params;
  const tenderId = Number(id);
  if (!db || !user?.orgId || !Number.isFinite(tenderId)) notFound();
  await redirectIfMarketsUnset(user.orgId);

  const [tender] = await db
    .select({
      tender: tenders,
      sourceName: sources.name,
      sourceUrl: sources.url,
      adapter: sources.adapter,
      lastSyncStatus: sources.lastSyncStatus,
      lastSyncedAt: sources.lastSyncedAt,
    })
    .from(tenders)
    .innerJoin(sources, eq(sources.id, tenders.sourceId))
    .where(and(eq(tenders.id, tenderId), eq(tenders.orgId, user.orgId)))
    .limit(1);
  if (!tender) notFound();

  const [matches, versions, requirements, gaps, pipeline, activity, assessment, history, notes, relations] =
    await Promise.all([
      db
        .select({ name: catalogServiceLines.name, score: tenderCatalogMatches.score })
        .from(tenderCatalogMatches)
        .innerJoin(
          catalogServiceLines,
          eq(catalogServiceLines.id, tenderCatalogMatches.catalogServiceLineId),
        )
        .where(eq(tenderCatalogMatches.tenderId, tenderId)),
      db
        .select()
        .from(opportunityVersions)
        .where(eq(opportunityVersions.tenderId, tenderId))
        .orderBy(desc(opportunityVersions.detectedAt)),
      db
        .select()
        .from(opportunityRequirements)
        .where(
          and(
            eq(opportunityRequirements.tenderId, tenderId),
            eq(opportunityRequirements.orgId, user.orgId),
          ),
        ),
      db
        .select()
        .from(capabilityGaps)
        .where(and(eq(capabilityGaps.tenderId, tenderId), eq(capabilityGaps.orgId, user.orgId))),
      db
        .select()
        .from(bidPipeline)
        .where(and(eq(bidPipeline.tenderId, tenderId), eq(bidPipeline.orgId, user.orgId)))
        .limit(1),
      db
        .select()
        .from(pipelineActivity)
        .where(and(eq(pipelineActivity.tenderId, tenderId), eq(pipelineActivity.orgId, user.orgId)))
        .orderBy(desc(pipelineActivity.createdAt))
        .limit(8),
      latestAssessment(db, user.orgId, tenderId),
      db
        .select()
        .from(qualificationAssessments)
        .where(
          and(
            eq(qualificationAssessments.orgId, user.orgId),
            eq(qualificationAssessments.tenderId, tenderId),
          ),
        )
        .orderBy(desc(qualificationAssessments.assessedAt))
        .limit(6),
      db
        .select({
          id: opportunityNotes.id,
          body: opportunityNotes.body,
          createdAt: opportunityNotes.createdAt,
          author: users.name,
        })
        .from(opportunityNotes)
        .leftJoin(users, eq(users.id, opportunityNotes.authorId))
        .where(and(eq(opportunityNotes.orgId, user.orgId), eq(opportunityNotes.tenderId, tenderId)))
        .orderBy(desc(opportunityNotes.createdAt)),
      db
        .select()
        .from(opportunityRelations)
        .where(
          and(
            eq(opportunityRelations.orgId, user.orgId),
            eq(opportunityRelations.status, "confirmed"),
            or(
              eq(opportunityRelations.leftTenderId, tenderId),
              eq(opportunityRelations.rightTenderId, tenderId),
            ),
          ),
        ),
    ]);

  const row = tender.tender;
  const canEdit = user.role !== "viewer";
  const earlier = history.filter((item) => item.id !== assessment?.id);
  const decisionNote = !assessment
    ? "This invitation has not been compared with your company yet. The word count on the list is not that comparison."
    : assessment.deepScanStatus === "incomplete"
      ? "The check could not read enough of the notice, so qualification is not scored. Open the official notice. A longer description, or a stored document the workspace can read, lets the next run continue. Company and Evidence are what that run compares against."
      : assessment.overallStatus === "INSUFFICIENT INFORMATION"
        ? "There is not enough about your company to compare with this invitation. Add the legal name and description on Company, then compare again."
        : null;

  return (
    <PageShell
      title={row.title}
      lede={`${tender.sourceName} · ${row.referenceId} · ${row.countryLabel ?? "Country unknown"}`}
      action={
        <Link href="/" className="text-sm text-blue-700">
          Back to tenders
        </Link>
      }
    >
      <SectionCard
        title="Qualification"
        lede="This is where the invitation is compared with your company. Not assessed means nobody has done that yet. The word count on the list is not that comparison."
      >
        {decisionNote && (
          <p className="mb-6 rounded-xl bg-slate-50 px-4 py-4 text-sm leading-relaxed text-slate-700">
            {decisionNote}{" "}
            <Link href="/company" className="text-blue-700">
              Company
            </Link>
            {" · "}
            <Link href="/evidence" className="text-blue-700">
              Evidence
            </Link>
            {" · "}
            <Link href="/gaps" className="text-blue-700">
              Gaps
            </Link>
          </p>
        )}
        {!assessment ? (
          <EmptyState>Not compared yet. This stays blank until you choose Compare with your company.</EmptyState>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <StatusPill tone={toneForStatus(assessment.overallStatus)}>
                {statusLabel(assessment.overallStatus)}
              </StatusPill>
              <StatusPill>{statusLabel(assessment.recommendedAction)}</StatusPill>
              <StatusPill>Method: {statusLabel(assessment.method)}</StatusPill>
              <StatusPill>Scan: {statusLabel(assessment.deepScanStatus)}</StatusPill>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Fact label="Relevance" value={assessment.relevanceScore?.toString() ?? "Not scored"} />
              <Fact label="Qualification" value={assessment.qualificationScore?.toString() ?? "Not scored"} />
              <Fact label="Evidence confidence" value={assessment.evidenceConfidence?.toString() ?? "Not scored"} />
              <Fact label="Deadline" value={assessment.deadlineUrgency ?? "Unknown"} />
            </dl>
            <p className="text-sm leading-relaxed text-slate-700">{assessment.explanation}</p>
            <p className="text-sm leading-relaxed text-slate-600">{assessment.mismatchExplanation}</p>
          </div>
        )}
        {canEdit && (
          <div className="mt-6">
            <AssessButton tenderId={tenderId} />
          </div>
        )}
        <h3 className="mt-8 text-base font-semibold text-slate-900">Requirement cards</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          Each card is one statement from the notice: the words, whether it is mandatory, the status, where it was read, and the evidence note.
        </p>
        <div className="mt-4 space-y-4">
          {requirements.length === 0 && (
            <p className="text-sm text-slate-600">No requirement cards yet. They appear after a check that can read the notice.</p>
          )}
          {requirements.map((item) => {
            const linked = gaps.filter(
              (gap) => item.description.startsWith(gap.description.slice(0, 80)),
            );
            return (
              <article key={item.id} className="rounded-xl border border-slate-200 px-5 py-5">
                <div className="flex flex-wrap gap-2">
                  <StatusPill tone={toneForStatus(item.status)}>{statusLabel(item.status)}</StatusPill>
                  {item.mandatory && <StatusPill tone="info">Mandatory</StatusPill>}
                  <StatusPill>{item.category}</StatusPill>
                  {item.reviewState === "pending" && <StatusPill tone="missing">Awaiting acceptance</StatusPill>}
                </div>
                <p className="mt-4 text-sm leading-relaxed text-slate-800">{item.description}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.evidenceNote}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Read from {item.sourceRef ?? statusLabel(item.sourceKind)}
                </p>
                {item.reviewState === "pending" && canEdit && (
                  <div className="mt-3">
                    <AcceptRequirementButton id={item.id} />
                  </div>
                )}
                {linked.map((gap) => (
                  <p key={gap.id} className="mt-3 text-sm text-slate-600">
                    Gap · {gap.status}: {gap.correctiveAction}
                  </p>
                ))}
              </article>
            );
          })}
        </div>
        {earlier.length > 0 && (
          <div className="mt-8">
            <h3 className="text-base font-semibold">Earlier checks</h3>
            <ul className="mt-3 space-y-3">
              {earlier.map((item) => (
                <li key={item.id} className="text-sm text-slate-600">
                  {formatWhen(item.assessedAt)} · {statusLabel(item.overallStatus)} · method{" "}
                  {statusLabel(item.method)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Pipeline"
        lede="Not accepted yet means this notice is not being worked. Accepting it, and choosing a stage, happens on Pipeline."
      >
        <p className="text-sm text-slate-700">
          Stage: {stageLabel(pipeline[0]?.stage)}
          {pipeline[0]?.internalDeadline
            ? ` · internal deadline ${formatWhen(pipeline[0].internalDeadline)}`
            : ""}
        </p>
        <Link className="mt-3 inline-block text-sm text-blue-700" href="/pipeline">
          Open pipeline
        </Link>
        <ul className="mt-4 space-y-2">
          {activity.map((item) => (
            <li key={item.id} className="text-sm text-slate-600">
              {formatWhen(item.createdAt)} · {item.action}
              {item.detail ? `: ${item.detail}` : ""}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Overview">
        <dl className="grid gap-5 sm:grid-cols-2">
          <Fact label="Buyer" value={row.buyer?.trim() ? row.buyer : "Not sent by this source"} />
          <Fact label="Category" value={row.category} />
          <Fact label="Published" value={formatWhen(row.publishedAt)} />
          <Fact
            label="Closing"
            value={`${formatWhen(row.deadline)}${row.deadlineTimezone ? ` · ${row.deadlineTimezone}` : ""}`}
          />
          <Fact
            label="Value"
            value={row.estimatedValue ? `${row.estimatedValue} ${row.currency ?? ""}`.trim() : "Not sent by this source"}
          />
          <Fact label="Data confidence" value={statusLabel(row.dataConfidence)} />
        </dl>
        <p className="mt-6 text-sm leading-relaxed text-slate-600">
          Keyword match {row.matchScore}. That is 10 points for each whole-word hit. It is not the qualification result.
          Buyer and value say “Not sent by this source” when the connector left them blank.
        </p>
        {row.titleEn && (
          <p className="mt-6 text-sm leading-relaxed text-slate-600">
            English reading for matching: {row.titleEn}. The description below stays in the buyer’s words.
            A comparison with your company uses those words.
          </p>
        )}
        {row.url && (
          <a className="mt-4 inline-block text-sm text-blue-700" href={row.url}>
            Official notice
          </a>
        )}
        {row.description && (
          <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{row.description}</p>
        )}
      </SectionCard>

      <SectionCard title="Why this may match">
        {matches.length === 0 ? (
          <p className="text-sm leading-relaxed text-slate-600">
            No curated catalog keyword hit.{" "}
            {row.relevanceReason ?? "The service-line gate reason is not stored."}
          </p>
        ) : (
          <ul className="space-y-3">
            {matches.map((match) => (
              <li key={match.name} className="rounded-xl bg-slate-50 px-4 py-4 text-sm">
                {match.name} · keyword match {match.score}
              </li>
            ))}
          </ul>
        )}
        <h3 className="mt-8 text-base font-semibold">Sources and provenance</h3>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Adapter {tender.adapter}. Last sync {tender.lastSyncStatus ?? "not recorded"}
          {tender.lastSyncedAt ? ` at ${formatWhen(tender.lastSyncedAt)}` : ""}.
        </p>
        <h3 className="mt-6 text-base font-semibold">Deadline history</h3>
        {versions.length === 0 ? (
          <p className="mt-3 text-sm text-slate-600">No deadline change recorded.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {versions.map((version) => (
              <li key={version.id} className="text-sm leading-relaxed text-slate-700">
                {deadlineHistoryNote(version.previousValue, version.newValue)} Detected{" "}
                {formatWhen(version.detectedAt)}.
              </li>
            ))}
          </ul>
        )}
        {relations.length > 0 && (
          <>
            <h3 className="mt-6 text-base font-semibold">Related publications</h3>
            <ul className="mt-3 space-y-2">
              {relations.map((relation) => {
                const other =
                  relation.leftTenderId === tenderId
                    ? relation.rightTenderId
                    : relation.leftTenderId;
                return (
                  <li key={relation.id}>
                    <Link className="text-sm text-blue-700" href={`/opportunities/${other}`}>
                      Related notice {other}
                    </Link>
                    <p className="text-sm text-slate-500">{relation.reason}</p>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </SectionCard>

      <SectionCard title="Notes">
        <ul className="space-y-4">
          {notes.map((note) => (
            <li key={note.id} className="rounded-xl bg-slate-50 px-4 py-4">
              <p className="text-sm leading-relaxed text-slate-800">{note.body}</p>
              <p className="mt-2 text-sm text-slate-500">
                {note.author ?? "Someone"} · {formatWhen(note.createdAt)}
              </p>
            </li>
          ))}
        </ul>
        {notes.length === 0 && <p className="text-sm text-slate-600">No notes yet.</p>}
        {canEdit && (
          <div className="mt-6">
            <NoteForm tenderId={tenderId} />
          </div>
        )}
      </SectionCard>
    </PageShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{value}</dd>
    </div>
  );
}
