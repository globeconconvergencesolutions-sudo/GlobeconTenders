import { Skeleton } from "@/components/ui/skeleton";

export function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-border dark:bg-card"
        >
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-9 w-16" />
        </div>
      ))}
    </div>
  );
}

export function TenderCardsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-slate-200 bg-white p-5 dark:border-border dark:bg-card"
        >
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="mt-3 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-2/3" />
          <div className="mt-4 flex gap-2">
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <StatsCardsSkeleton />
      <div className="flex gap-3">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-40" />
      </div>
      <TenderCardsSkeleton />
    </div>
  );
}
