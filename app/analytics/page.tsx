import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";
import { getAnalyticsSnapshot } from "@/lib/tenders/queries";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getAnalyticsSnapshot();

  return (
    <div className="flex min-h-full flex-col bg-slate-50 dark:bg-background">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-5 dark:border-border dark:bg-card sm:px-6 lg:px-8 lg:py-6">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tender pipeline insights across sources, regions, and categories
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
