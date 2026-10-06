import { redirect } from "next/navigation";
import { desc, eq, sql } from "drizzle-orm";

import { ApproveSourceForm, SourceCandidateForm } from "@/components/pis/actions";
import { PageShell, SectionCard, StatusPill } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { sources, syncLogs } from "@/lib/db/schema";
import { formatWhen, statusLabel } from "@/lib/pis/format";
import { describeSourceReading } from "@/lib/pis/source-reading";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function SourceHealthPage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);

  const rows = await db
    .select({
      id: sources.id,
      name: sources.name,
      adapter: sources.adapter,
      enabled: sources.enabled,
      reviewStatus: sources.reviewStatus,
      url: sources.url,
      lastSyncedAt: sources.lastSyncedAt,
      lastSyncStatus: sources.lastSyncStatus,
      lastSyncError: sources.lastSyncError,
      opportunities: sql<number>`(
        select count(*)::int from tenders
        where tenders.source_id = ${sources.id}
          and tenders.org_id = ${user.orgId}
      )`,
    })
    .from(sources)
    .where(eq(sources.orgId, user.orgId))
    .orderBy(desc(sources.lastSyncedAt));

  const logs = await db
    .select()
    .from(syncLogs)
    .where(eq(syncLogs.orgId, user.orgId))
    .orderBy(desc(syncLogs.syncedAt))
    .limit(12);

  const active = rows.filter((row) => row.reviewStatus !== "candidate" && row.enabled);
  const canApprove = user.role === "admin" || user.role === "super_admin";

  return (
    <PageShell
      title="Sources"
      lede={`${active.length} connected sources. Each card says where that connector reads. A candidate stays off until an administrator approves an existing connector. This page does not search the open web.`}
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <SectionCard>
          <p className="text-3xl font-semibold">{active.length}</p>
          <p className="mt-2 text-sm text-slate-600">Connected</p>
        </SectionCard>
        <SectionCard>
          <p className="text-3xl font-semibold">
            {rows.filter((row) => row.lastSyncStatus && row.lastSyncStatus !== "success").length}
          </p>
          <p className="mt-2 text-sm text-slate-600">Last sync not successful</p>
        </SectionCard>
        <SectionCard>
          <p className="text-3xl font-semibold">
            {rows.reduce((sum, row) => sum + Number(row.opportunities ?? 0), 0)}
          </p>
          <p className="mt-2 text-sm text-slate-600">Notices stored</p>
        </SectionCard>
      </div>

      <div className="space-y-4">
        {rows.map((row) => {
          const reading = describeSourceReading(row.adapter, row.url);
          return (
          <SectionCard key={row.id}>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-lg font-semibold text-slate-900">{row.name}</h2>
              <StatusPill tone={row.reviewStatus === "candidate" ? "missing" : "ready"}>
                {statusLabel(row.reviewStatus)}
              </StatusPill>
              <StatusPill>{row.enabled ? "Enabled" : "Off"}</StatusPill>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              {row.adapter} · {Number(row.opportunities)} notices · last sync{" "}
              {row.lastSyncedAt ? formatWhen(row.lastSyncedAt) : "never"} ·{" "}
              {row.lastSyncStatus ? statusLabel(row.lastSyncStatus) : "Not scanned"}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-700">
              {reading.reads} {reading.notice}
            </p>
            {row.lastSyncError && (
              <p className="mt-3 text-sm leading-relaxed text-rose-700">{row.lastSyncError}</p>
            )}
            {row.url && (
              <a className="mt-3 inline-block max-w-full break-all text-sm text-blue-700" href={row.url}>
                Official site
              </a>
            )}
            {row.reviewStatus === "candidate" && canApprove && <ApproveSourceForm id={row.id} />}
          </SectionCard>
          );
        })}
      </div>

      {user.role !== "viewer" && (
        <SectionCard title="Add a candidate" lede="A candidate stays off until an administrator approves an existing connector.">
          <SourceCandidateForm canApprove={canApprove} />
        </SectionCard>
      )}

      <SectionCard title="Recent scan log">
        {logs.length === 0 ? (
          <p className="text-sm text-slate-600">
            No rows in the scan log. The cards above still show the last status stored on each source.
          </p>
        ) : (
          <ul className="space-y-3">
            {logs.map((log) => (
              <li key={log.id} className="text-sm leading-relaxed text-slate-700">
                {formatWhen(log.syncedAt)} · {statusLabel(log.status)} · {log.tenderCount} records
                {log.errorMessage ? ` · ${log.errorMessage}` : ""}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </PageShell>
  );
}
