import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { RepairCoreButton } from "@/components/pis/actions";
import { PageShell } from "@/components/pis/shell";
import { WatchlistEditor } from "@/components/pis/watchlist-editor";
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
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";

export const dynamic = "force-dynamic";

export default async function WatchlistsPage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);

  const hidden = await db
    .select({ id: orgHiddenCatalogLines.catalogServiceLineId })
    .from(orgHiddenCatalogLines)
    .where(eq(orgHiddenCatalogLines.orgId, user.orgId));
  const hiddenIds = new Set(hidden.map((row) => row.id));

  const [lines, lists] = await Promise.all([
    db
      .select({
        id: catalogServiceLines.id,
        name: catalogServiceLines.name,
        relevance: catalogServiceLines.globeconRelevance,
        fieldName: marketFields.name,
        sortOrder: marketFields.sortOrder,
      })
      .from(catalogServiceLines)
      .innerJoin(marketFields, eq(marketFields.id, catalogServiceLines.marketFieldId))
      .orderBy(asc(marketFields.sortOrder), asc(catalogServiceLines.name)),
    db
      .select()
      .from(watchlists)
      .where(eq(watchlists.orgId, user.orgId)),
  ]);

  const active = lists.find((list) => list.isActive) ?? lists[0] ?? null;
  const selected = active
    ? await db
        .select({ id: watchlistLines.catalogServiceLineId })
        .from(watchlistLines)
        .where(eq(watchlistLines.watchlistId, active.id))
    : [];

  const visibleLines = lines.filter((line) => !hiddenIds.has(line.id));

  return (
    <PageShell
      title="Watchlists"
      lede="The topics on the active watchlist decide which invitations Tenders shows. Add or remove service lines here. Globecon Core stays the starting set only for that workspace."
      action={
        active?.name === "Globecon Core" && user.role !== "viewer" ? (
          <RepairCoreButton watchlistId={active.id} />
        ) : null
      }
    >
      <WatchlistEditor
        watchlistId={active?.id ?? null}
        name={active?.name ?? "My watchlist"}
        selectedIds={selected.map((row) => row.id)}
        lines={visibleLines.map((line) => ({
          id: line.id,
          name: line.name,
          fieldName: line.fieldName,
          relevance: line.relevance,
        }))}
        canEdit={user.role !== "viewer"}
      />
    </PageShell>
  );
}
