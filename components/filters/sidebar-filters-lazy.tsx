"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const OpportunityFilters = dynamic(
  () =>
    import("@/components/filters/opportunity-filters").then((mod) => ({
      default: mod.OpportunityFilters,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    ),
  },
);

/** @deprecated Filters live in the dashboard drawer */
export function SidebarFiltersLazy() {
  return <OpportunityFilters />;
}
