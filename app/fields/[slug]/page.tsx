import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { HideLineButton } from "@/components/pis/actions";
import { FieldLines } from "@/components/pis/field-lines";
import { PageShell } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  catalogServiceLines,
  marketFields,
  orgHiddenCatalogLines,
  watchlistLines,
  watchlists,
} from "@/lib/db/schema";
import { getOrgContext } from "@/lib/tenant/org-context";
import { guidanceForField } from "@/lib/pis/field-guidance";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";

export const dynamic = "force-dynamic";

export default async function FieldDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  const { slug } = await params;
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);

  const [field] = await db
    .select()
    .from(marketFields)
    .where(eq(marketFields.slug, slug))
    .limit(1);
  if (!field) notFound();

  const [lines, hidden, activeList] = await Promise.all([
    db
      .select()
      .from(catalogServiceLines)
      .where(eq(catalogServiceLines.marketFieldId, field.id))
      .orderBy(asc(catalogServiceLines.name)),
    db
      .select({ id: orgHiddenCatalogLines.catalogServiceLineId })
      .from(orgHiddenCatalogLines)
      .where(eq(orgHiddenCatalogLines.orgId, user.orgId)),
    db
      .select()
      .from(watchlists)
      .where(and(eq(watchlists.orgId, user.orgId), eq(watchlists.isActive, true)))
      .limit(1),
  ]);
  const hiddenIds = new Set(hidden.map((row) => row.id));
  const active = activeList[0] ?? null;
  const selected = active
    ? await db
        .select({ id: watchlistLines.catalogServiceLineId })
        .from(watchlistLines)
        .where(eq(watchlistLines.watchlistId, active.id))
    : [];

  return (
    <PageShell
      title={field.name}
      lede={`${guidanceForField(field.slug)} ${lines.length} service lines. Lines on the active watchlist are checked.`}
      action={
        <Link href="/fields" className="text-sm text-blue-700">
          All fields
        </Link>
      }
    >
      <FieldLines
        watchlistId={active?.id ?? null}
        watchlistName={active?.name ?? "My watchlist"}
        selectedIds={selected.map((row) => row.id)}
        canEdit={user.role !== "viewer"}
        lines={lines
          .filter((line) => !hiddenIds.has(line.id))
          .map((line) => ({
            id: line.id,
            name: line.name,
            fieldName: field.name,
            relevance: line.globeconRelevance,
          }))}
      />
      {(user.role === "admin" || user.role === "super_admin") && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-semibold">Hide a line</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Hidden lines leave the picker and the watchlist. They stay in the shared catalog.
          </p>
          <ul className="mt-6 space-y-3">
            {lines.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-4 text-sm">
                <span>{line.name}</span>
                <HideLineButton lineId={line.id} hidden={hiddenIds.has(line.id)} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </PageShell>
  );
}
