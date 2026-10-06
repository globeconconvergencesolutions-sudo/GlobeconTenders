import Link from "next/link";
import { redirect } from "next/navigation";

import { MarkReadButton } from "@/components/pis/actions";
import { EmptyState, PageShell, SectionCard, StatusPill } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { loadInbox, type InboxItem } from "@/lib/pis/inbox";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

const GROUPS: InboxItem["group"][] = [
  "Closing soon",
  "New in the watchlist",
  "Keyword match",
  "Deadline changed",
  "Evidence expiring",
];

export default async function AlertsPage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);

  const items = await loadInbox(db, user.orgId, user.id);

  return (
    <PageShell
      title="Alerts"
      lede="Deadlines, new keyword matches, and expiring documents on this watchlist. Email is a separate older digest under Email settings."
      action={
        <Link href="/settings/notifications" className="text-sm text-blue-700">
          Email settings
        </Link>
      }
    >
      <SectionCard title="What you are looking at">
        <ul className="space-y-3 text-sm leading-relaxed text-slate-700">
          <li>Closing soon — the official close is inside the next 7 days.</li>
          <li>New in the watchlist — stored in the last 7 days.</li>
          <li>Keyword match — the word score is 30 or higher. This is not a qualification result.</li>
          <li>Deadline changed — the official close moved.</li>
          <li>Evidence expiring — a record on Evidence expires within 30 days.</li>
        </ul>
      </SectionCard>
      {GROUPS.map((group) => {
        const rows = items.filter((item) => item.group === group);
        return (
          <SectionCard key={group} title={group}>
            {rows.length === 0 ? (
              <p className="text-sm text-slate-600">Nothing in this group.</p>
            ) : (
              <ul className="space-y-4">
                {rows.map((item) => (
                  <li key={item.key} className="rounded-xl bg-slate-50 px-5 py-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <Link href={item.href} className="text-base font-medium text-slate-900">
                        {item.title}
                      </Link>
                      {item.read && <StatusPill>Read</StatusPill>}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.detail}</p>
                    {!item.read && user.role !== "viewer" && (
                      <div className="mt-3">
                        <MarkReadButton alertKey={item.key} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        );
      })}
      {items.length === 0 && (
        <EmptyState>No alerts for the active watchlist right now.</EmptyState>
      )}
    </PageShell>
  );
}
