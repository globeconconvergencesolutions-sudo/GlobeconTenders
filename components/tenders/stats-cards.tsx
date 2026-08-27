"use client";

import {
  Archive,
  Clock,
  Globe,
  TriangleAlert,
} from "lucide-react";

import { useLexicon } from "@/components/providers/org-context-provider";
import { Card, CardContent } from "@/components/ui/card";
import type { ListingBucket } from "@/lib/tenders/lifecycle";

type SerializableStats = {
  matchingTenders: number;
  closingWithin3Days: number;
  openInDatabase: number;
  staleListings: number;
  archivedListings: number;
  activeSources: number;
  lastSynced: string | null;
  trackingSources: number;
};

type StatsCardsProps = {
  stats: SerializableStats;
  listingBucket: ListingBucket;
};

export function StatsCards({ stats, listingBucket }: StatsCardsProps) {
  const { lexicon } = useLexicon();

  const matchingLabel =
    listingBucket === "stale"
      ? "Stale listings in view"
      : listingBucket === "archive"
        ? "Archived in view"
        : listingBucket === "all"
          ? `All ${lexicon.opportunityPlural.toLowerCase()}`
          : `Live ${lexicon.opportunityPlural.toLowerCase()}`;

  const statConfig = [
    {
      key: "matchingTenders" as const,
      label: matchingLabel,
      icon: Globe,
    },
    {
      key: "closingWithin3Days" as const,
      label: "Closing within 3 days",
      icon: Clock,
    },
    {
      key: "staleListings" as const,
      label: "Stale (past deadline, still open)",
      icon: TriangleAlert,
    },
    {
      key: "archivedListings" as const,
      label: "Expired / closed archive",
      icon: Archive,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {statConfig.map(({ key, label, icon: Icon }) => (
        <Card key={key} className="border-slate-200 shadow-sm">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">
                {stats[key]}
              </p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
