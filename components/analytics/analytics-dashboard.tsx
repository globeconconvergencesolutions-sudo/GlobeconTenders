"use client";

import {
  Bookmark,
  CalendarClock,
  Database,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import {
  useFeatures,
  useLexicon,
} from "@/components/providers/org-context-provider";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalyticsSnapshot } from "@/lib/tenders/queries";
import { cn } from "@/lib/utils";

type SerializableAnalytics = Omit<
  AnalyticsSnapshot,
  "recentSyncs"
> & {
  recentSyncs: Array<
    Omit<AnalyticsSnapshot["recentSyncs"][number], "syncedAt"> & {
      syncedAt: string;
    }
  >;
};

type AnalyticsDashboardProps = {
  data: SerializableAnalytics;
};

function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color?: string;
}) {
  const width = max > 0 ? Math.max(4, (count / max) * 100) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="shrink-0 font-medium tabular-nums">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", !color && "bg-blue-500")}
          style={{ width: `${width}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const { lexicon } = useLexicon();
  const features = useFeatures();
  const opp = lexicon.opportunityPlural.toLowerCase();
  const maxSource = Math.max(...data.bySource.map((row) => row.count), 1);
  const maxRegion = Math.max(...data.byRegion.map((row) => row.count), 1);
  const maxCategory = Math.max(...data.byCategory.map((row) => row.count), 1);

  const summaryCards = [
    {
      label: `Open ${opp}`,
      value: data.openTenders,
      icon: Database,
      accent: "bg-blue-50 text-blue-600",
      show: true,
    },
    {
      label: `Saved ${opp}`,
      value: data.savedTenders,
      icon: Bookmark,
      accent: "bg-rose-50 text-rose-600",
      show: true,
    },
    {
      label: "Closing in 7 days",
      value: data.closingWithin7Days,
      icon: CalendarClock,
      accent: "bg-amber-50 text-amber-600",
      show: true,
    },
    {
      label: `Avg ${lexicon.matchScore.toLowerCase()}`,
      value: data.avgMatchScore,
      icon: TrendingUp,
      accent: "bg-emerald-50 text-emerald-600",
      show: features.matchScore,
    },
  ].filter((card) => card.show);

  return (
    <div className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className="border-slate-200 shadow-sm">
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight">
                  {value}
                </p>
              </div>
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  accent,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-base font-semibold">
              Open {opp} by {lexicon.source.toLowerCase()}
            </h2>
            {data.bySource.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              data.bySource.map((row) => (
                <BarRow
                  key={row.name}
                  label={row.name}
                  count={row.count}
                  max={maxSource}
                  color={row.color}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-base font-semibold">
              Open {opp} by {lexicon.region.toLowerCase()}
            </h2>
            {data.byRegion.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              data.byRegion.map((row) => (
                <BarRow
                  key={row.name}
                  label={row.name}
                  count={row.count}
                  max={maxRegion}
                />
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-4 p-5">
            <h2 className="text-base font-semibold">
              Open {opp} by {lexicon.category.toLowerCase()}
            </h2>
            {data.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data yet.</p>
            ) : (
              data.byCategory.map((row) => (
                <BarRow
                  key={row.name}
                  label={row.name}
                  count={row.count}
                  max={maxCategory}
                />
              ))
            )}
          </CardContent>
        </Card>

        {features.sync && (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold">
                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                Recent {lexicon.sync.toLowerCase()} activity
              </h2>
              {data.recentSyncs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sync runs recorded yet.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-border">
                  {data.recentSyncs.map((row, index) => (
                    <div
                      key={`${row.syncedAt}-${index}`}
                      className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {row.sourceName ?? `All ${lexicon.sourcePlural.toLowerCase()}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(row.syncedAt).toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p
                          className={cn(
                            "text-xs font-medium capitalize",
                            row.status === "success"
                              ? "text-emerald-600"
                              : "text-red-600",
                          )}
                        >
                          {row.status}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.tenderCount} {opp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {data.totalTenders} total {opp} in database · {data.closingWithin30Days}{" "}
        closing within 30 days
      </p>
    </div>
  );
}
