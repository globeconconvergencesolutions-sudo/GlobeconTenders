import { DashboardLoadingSkeleton } from "@/components/tenders/dashboard-skeleton";

export default function HomeLoading() {
  return (
    <div className="min-h-full bg-slate-50 dark:bg-background">
      <div className="border-b border-slate-200 bg-white px-4 py-6 dark:border-border dark:bg-card sm:px-6 lg:px-8">
        <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-slate-100 dark:bg-slate-800/80" />
      </div>
      <DashboardLoadingSkeleton />
    </div>
  );
}
