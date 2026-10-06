import Link from "next/link";
import { redirect } from "next/navigation";
import { eq, inArray } from "drizzle-orm";

import { RelationButtons } from "@/components/pis/actions";
import { EmptyState, PageShell, SectionCard, StatusPill } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { opportunityRelations, tenders } from "@/lib/db/schema";
import { refreshDuplicateProposals } from "@/lib/pis/duplicates";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);

  await refreshDuplicateProposals(db, user.orgId);
  const pairs = await db
    .select()
    .from(opportunityRelations)
    .where(eq(opportunityRelations.orgId, user.orgId));
  const ids = [...new Set(pairs.flatMap((pair) => [pair.leftTenderId, pair.rightTenderId]))];
  const titles =
    ids.length === 0
      ? []
      : await db
          .select({ id: tenders.id, title: tenders.title, sourceId: tenders.sourceId })
          .from(tenders)
          .where(inArray(tenders.id, ids));
  const byId = new Map(titles.map((row) => [row.id, row]));
  const proposed = pairs.filter((pair) => pair.status === "proposed");

  return (
    <PageShell
      title="Review"
      lede="Two stored notices that may be the same piece of work. Confirm keeps both and links them. An empty page means no pair was suggested."
    >
      {proposed.length === 0 ? (
        <EmptyState>
          No pair has been suggested from the notices stored here. An empty list means nothing was proposed. It does not mean lookalikes were cleaned up.
        </EmptyState>
      ) : (
        proposed.map((pair) => {
          const left = byId.get(pair.leftTenderId);
          const right = byId.get(pair.rightTenderId);
          return (
            <SectionCard key={pair.id}>
              <StatusPill>Proposed</StatusPill>
              <p className="mt-4 text-sm leading-relaxed text-slate-600">{pair.reason}</p>
              <div className="mt-4 space-y-2">
                <Link className="block text-sm text-blue-700" href={`/opportunities/${pair.leftTenderId}`}>
                  {left?.title ?? `Notice ${pair.leftTenderId}`}
                </Link>
                <Link className="block text-sm text-blue-700" href={`/opportunities/${pair.rightTenderId}`}>
                  {right?.title ?? `Notice ${pair.rightTenderId}`}
                </Link>
              </div>
              {user.role !== "viewer" && <RelationButtons id={pair.id} />}
            </SectionCard>
          );
        })
      )}
    </PageShell>
  );
}
