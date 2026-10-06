import Link from "next/link";
import { redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";

import { DecisionPath } from "@/components/pis/decision-path";
import { EmptyState, PageShell, SectionCard, StatusPill } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { qualificationAssessments, tenders } from "@/lib/db/schema";
import { formatWhen, statusLabel, toneForStatus } from "@/lib/pis/format";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";
import { getActiveWatchlist, watchlistMatchSql } from "@/lib/pis/watchlist-feed";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function QualificationPage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);

  const assessments = await db
    .select({
      id: qualificationAssessments.id,
      tenderId: qualificationAssessments.tenderId,
      title: tenders.title,
      overall: qualificationAssessments.overallStatus,
      action: qualificationAssessments.recommendedAction,
      method: qualificationAssessments.method,
      scan: qualificationAssessments.deepScanStatus,
      at: qualificationAssessments.assessedAt,
    })
    .from(qualificationAssessments)
    .innerJoin(tenders, eq(tenders.id, qualificationAssessments.tenderId))
    .where(eq(qualificationAssessments.orgId, user.orgId))
    .orderBy(desc(qualificationAssessments.assessedAt))
    .limit(200);

  const latest = new Map<number, (typeof assessments)[number]>();
  for (const row of assessments) {
    if (!latest.has(row.tenderId)) latest.set(row.tenderId, row);
  }

  const watchlist = await getActiveWatchlist(db, user.orgId);
  const matches = watchlist
    ? await db
        .select({ id: tenders.id, title: tenders.title })
        .from(tenders)
        .where(and(eq(tenders.orgId, user.orgId), watchlistMatchSql(watchlist.lineIds)))
        .orderBy(desc(tenders.matchScore))
        .limit(30)
    : [];
  const unassessed = matches.filter((row) => !latest.has(row.id));

  return (
    <PageShell
      title="Qualification"
      lede="Invitations you have already compared with your company, and ones on your watchlist that you have not. The requirement cards are on the invitation. If the invitation cannot be read, there is no result."
    >
      <DecisionPath current="/qualification" />
      <SectionCard title="Assessed">
        {latest.size === 0 ? (
          <EmptyState actionHref="/" actionLabel="Open tenders">
            No comparisons yet. Open an invitation from Tenders and choose Compare with your company.
          </EmptyState>
        ) : (
          <ul className="space-y-4">
            {[...latest.values()].map((row) => (
              <li key={row.id} className="rounded-xl bg-slate-50 px-5 py-5">
                <Link href={`/opportunities/${row.tenderId}`} className="text-base font-medium text-slate-900">
                  {row.title}
                </Link>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusPill tone={toneForStatus(row.overall)}>{statusLabel(row.overall)}</StatusPill>
                  <StatusPill>{statusLabel(row.action)}</StatusPill>
                  <StatusPill>Method: {statusLabel(row.method)}</StatusPill>
                  <StatusPill>Scan: {statusLabel(row.scan)}</StatusPill>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  {formatWhen(row.at)}. Open the notice to read the requirement cards.
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard title="Not assessed" lede="Watchlist matches with no check. There is no qualification score in this list.">
        {unassessed.length === 0 ? (
          <p className="text-sm text-slate-600">Every loaded watchlist match has an assessment, or the watchlist is empty.</p>
        ) : (
          <ul className="space-y-3">
            {unassessed.map((row) => (
              <li key={row.id}>
                <Link className="text-sm text-blue-700" href={`/opportunities/${row.id}`}>
                  {row.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}
