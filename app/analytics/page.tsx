import { redirect } from "next/navigation";

import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { getSessionUser } from "@/lib/auth/session";
import { getAnalyticsSnapshot } from "@/lib/tenders/queries";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const orgContext = await getOrgContext();
  if (!orgContext.features.analytics) {
    redirect("/");
  }

  const user = await getSessionUser();
  const data = await getAnalyticsSnapshot(user?.orgId);

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-background">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-border dark:bg-card sm:px-6 lg:px-8 lg:py-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          {orgContext.lexicon.navAnalytics}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {orgContext.lexicon.opportunityPlural} pipeline insights across{" "}
          {orgContext.lexicon.sourcePlural.toLowerCase()},{" "}
          {orgContext.lexicon.region.toLowerCase()}s, and{" "}
          {orgContext.lexicon.categoryPlural.toLowerCase()}
        </p>
      </header>
      <AnalyticsDashboard
        data={{
          ...data,
          recentSyncs: data.recentSyncs.map((row) => ({
            ...row,
            syncedAt: row.syncedAt.toISOString(),
          })),
        }}
      />
    </div>
  );
}
