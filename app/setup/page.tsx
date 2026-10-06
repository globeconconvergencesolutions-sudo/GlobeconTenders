import { redirect } from "next/navigation";
import { asc, eq, sql } from "drizzle-orm";

import { MarketChooser } from "@/components/pis/market-chooser";
import { PageShell } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { catalogServiceLines, marketFields } from "@/lib/db/schema";
import { guidanceForField } from "@/lib/pis/field-guidance";
import { watchlistNeedsMarkets } from "@/lib/pis/calibration";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");

  const needs = await watchlistNeedsMarkets(db, user.orgId);
  if (!needs) redirect("/");

  if (user.role === "viewer") {
    return (
      <PageShell
        title="Markets are not chosen yet"
        lede="Someone who can edit this workspace needs to choose the markets. Until then, Tenders has no topics to follow."
      >
        <p className="text-sm leading-relaxed text-slate-600">
          Ask an admin or an analyst to open this workspace and pick the fields the firm bids in.
        </p>
      </PageShell>
    );
  }

  const fields = await db
    .select({
      id: marketFields.id,
      name: marketFields.name,
      slug: marketFields.slug,
      lineCount: sql<number>`count(${catalogServiceLines.id})`.mapWith(Number),
    })
    .from(marketFields)
    .leftJoin(catalogServiceLines, eq(catalogServiceLines.marketFieldId, marketFields.id))
    .where(eq(marketFields.active, true))
    .groupBy(marketFields.id)
    .orderBy(asc(marketFields.sortOrder));

  return (
    <PageShell
      title="What work do you want to see?"
      lede="A tender is a public invitation to bid. Choose the markets your firm actually works in. Tenders will show those invitations. You can add or remove topics later from Fields."
    >
      <MarketChooser
        fields={fields.map((field) => ({
          id: field.id,
          name: field.name,
          slug: field.slug,
          guidance: guidanceForField(field.slug),
          lineCount: field.lineCount,
        }))}
      />
    </PageShell>
  );
}
