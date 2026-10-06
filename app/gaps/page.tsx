import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";

import { DecisionPath } from "@/components/pis/decision-path";
import { EmptyState, PageShell, SectionCard, StatusPill } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { capabilityGaps } from "@/lib/db/schema";
import { getOrgContext } from "@/lib/tenant/org-context";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";

export const dynamic = "force-dynamic";

export default async function GapsPage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);

  const gaps = await db
    .select()
    .from(capabilityGaps)
    .where(eq(capabilityGaps.orgId, user.orgId))
    .orderBy(desc(capabilityGaps.createdAt))
    .limit(100);

  const groups = new Map<string, typeof gaps>();
  for (const gap of gaps) {
    const list = groups.get(gap.gapType) ?? [];
    list.push(gap);
    groups.set(gap.gapType, list);
  }

  return (
    <PageShell
      title="Gaps"
      lede="What the comparison could not satisfy. Gaps appear after a check. An empty profile is not proof the company cannot do the work."
    >
      <DecisionPath current="/gaps" />
      {gaps.length === 0 ? (
        <EmptyState actionHref="/qualification" actionLabel="Open qualification">
          No gaps yet. Compare an invitation with your company first. If the invitation cannot be read, or the company page is still empty, this page stays empty because there is nothing to record.
        </EmptyState>
      ) : (
        [...groups.entries()].map(([type, rows]) => (
          <SectionCard key={type} title={type}>
            <ul className="space-y-4">
              {rows.map((gap) => (
                <li key={gap.id} className="rounded-xl bg-slate-50 px-5 py-5">
                  <StatusPill tone={gap.status === "confirmed" ? "bad" : "missing"}>
                    {gap.status === "confirmed" ? "Confirmed" : "Evidence gap"}
                  </StatusPill>
                  <p className="mt-3 text-sm leading-relaxed text-slate-800">{gap.description}</p>
                  {gap.correctiveAction && (
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{gap.correctiveAction}</p>
                  )}
                  {gap.tenderId && (
                    <Link className="mt-3 inline-block text-sm text-blue-700" href={`/opportunities/${gap.tenderId}`}>
                      Open opportunity
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </SectionCard>
        ))
      )}
    </PageShell>
  );
}
