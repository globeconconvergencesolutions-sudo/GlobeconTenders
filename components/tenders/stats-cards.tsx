"use client";

import {
  Clock,
  Filter,
  Globe,
  TrendingUp,
} from "lucide-react";

import { useLexicon } from "@/components/providers/org-context-provider";
import { Card, CardContent } from "@/components/ui/card";

type SerializableStats = {
  matchingTenders: number;
  closingWithin3Days: number;
  openInDatabase: number;
  activeSources: number;
  lastSynced: string | null;
  trackingSources: number;
};

type StatsCardsProps = {
  stats: SerializableStats;
};

export function StatsCards({ stats }: StatsCardsProps) {
  const { lexicon } = useLexicon();

  const statConfig = [
    {
      key: "matchingTenders" as const,
      label: `Matching ${lexicon.opportunityPlural.toLowerCase()}`,
      icon: TrendingUp,
    },
    {
      key: "closingWithin3Days" as const,
      label: "Closing within 3 days",
      icon: Clock,
    },
    {
      key: "openInDatabase" as const,
      label: `Open ${lexicon.opportunityPlural.toLowerCase()}`,
      icon: Globe,
    },
    {
      key: "activeSources" as const,
      label: `Active ${lexicon.sourcePlural.toLowerCase()}`,
      icon: Filter,
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
