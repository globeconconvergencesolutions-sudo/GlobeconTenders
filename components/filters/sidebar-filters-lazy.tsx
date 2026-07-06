"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const SidebarFilters = dynamic(
  () =>
    import("@/components/filters/sidebar-filters").then((mod) => ({
      default: mod.SidebarFilters,
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

export function SidebarFiltersLazy() {
  return <SidebarFilters />;
}
