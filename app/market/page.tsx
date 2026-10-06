import { redirect } from "next/navigation";

import { EmptyState, PageShell, SectionCard } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { formatWhen } from "@/lib/pis/format";
import { loadMarketSummary } from "@/lib/pis/market";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function MarketPage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);
  const summary = await loadMarketSummary(db, user.orgId);

  return (
    <PageShell
      title="Market"
      lede={`What buyers in the stored notices keep asking for, inside your markets. ${summary.connected} connected sources out of ${summary.registered} registered. Last successful sync ${summary.lastSuccess ? formatWhen(summary.lastSuccess) : "has not been recorded"}.`}
    >
      <SectionCard title="What the sources did not send">
        <p className="text-sm leading-relaxed text-slate-700">
          {summary.stored} notices are stored. {summary.missingBuyer} have no buyer. {summary.missingValue} have no
          value. A blank means the connector left the field empty. It is not a zero, and it is not a guess.
        </p>
      </SectionCard>
      <SectionCard title="Demand by field">
        {summary.byField.length === 0 ? (
          <EmptyState>No notices in your markets have been tagged yet.</EmptyState>
        ) : (
          <ul className="space-y-3">
            {summary.byField.map((row) => (
              <li key={row.name} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-4 text-sm">
                <span>{row.name}</span>
                <span className="text-slate-600">{row.count} notices</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
      <SectionCard title="Demand by country">
        <ul className="space-y-3">
          {summary.byCountry.map((row) => (
            <li key={row.name} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-4 text-sm">
              <span>{row.name}</span>
              <span className="text-slate-600">{row.count}</span>
            </li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Readiness" lede={summary.readinessNote}>
        <p className="text-sm leading-relaxed text-slate-700">
          Company profile is {summary.profileReady ? "started" : "empty"}. {summary.readinessComplete} of{" "}
          {summary.readinessTotal} sections are filled. {summary.expiring} evidence records expire within 30 days.
        </p>
      </SectionCard>
      <SectionCard
        title="Possible later demand"
        lede="A pattern in past notices. These rows are not live tenders and they do not appear on the home list."
      >
        {summary.repeats.length === 0 ? (
          <EmptyState>No buyer and field pair repeats in the stored history.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {summary.repeats.map((row) => (
              <li key={`${row.buyer}-${row.field}`} className="rounded-xl bg-slate-50 px-5 py-5">
                <p className="text-sm font-medium text-slate-900">{row.buyer}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {row.field} appeared on {row.count} stored notices. This is a pattern, not a new opportunity.
                </p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}
