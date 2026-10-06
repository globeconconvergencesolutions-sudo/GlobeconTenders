import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { EmptyState, PageShell, SectionCard } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { catalogServiceLines, marketFields, watchlistLines, watchlists } from "@/lib/db/schema";
import { getOrgContext } from "@/lib/tenant/org-context";
import { guidanceForField } from "@/lib/pis/field-guidance";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";

export const dynamic = "force-dynamic";

export default async function FieldsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const fields = await db.select().from(marketFields).orderBy(asc(marketFields.sortOrder));
  const lines = await db
    .select({
      id: catalogServiceLines.id,
      fieldId: catalogServiceLines.marketFieldId,
      relevance: catalogServiceLines.globeconRelevance,
      name: catalogServiceLines.name,
    })
    .from(catalogServiceLines);

  const [active] = await db
    .select({ id: watchlists.id })
    .from(watchlists)
    .where(and(eq(watchlists.orgId, user.orgId), eq(watchlists.isActive, true)))
    .limit(1);
  const selected = active
    ? await db
        .select({ id: watchlistLines.catalogServiceLineId })
        .from(watchlistLines)
        .where(eq(watchlistLines.watchlistId, active.id))
    : [];
  const selectedIds = new Set(selected.map((row) => row.id));
  const selectedFieldIds = new Set(
    lines.filter((line) => selectedIds.has(line.id)).map((line) => line.fieldId),
  );

  const cards = fields
    .map((field) => ({
      ...field,
      inWatchlist: selectedFieldIds.has(field.id),
    }))
    .filter((field) => {
      if (!query) return field.inWatchlist;
      return (
        field.name.toLowerCase().includes(query) ||
        lines.some(
          (line) => line.fieldId === field.id && line.name.toLowerCase().includes(query),
        )
      );
    })
    .slice(0, 24);

  return (
    <PageShell
      title="Market fields"
      lede="Search the shared catalog and open a field to add its service lines. The cards below are the fields already on your watchlist."
    >
      <form className="max-w-md" action="/fields">
        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-800">Search</span>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Field or service line"
            className="h-11 w-full rounded-md border border-input bg-white px-3 text-sm"
          />
        </label>
      </form>
      {cards.length === 0 ? (
        <EmptyState>Search for a market field to see its service lines.</EmptyState>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cards.map((field) => (
            <Link key={field.id} href={`/fields/${field.slug}`}>
              <SectionCard>
                <h2 className="text-lg font-semibold text-slate-900">{field.name}</h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {guidanceForField(field.slug)}
                </p>
              </SectionCard>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
