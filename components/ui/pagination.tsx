"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
  /** Wrap navigation so the results overlay can show while the server loads. */
  onNavigate?: (href: string) => void;
  itemLabel?: string;
};

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  buildHref,
  onNavigate,
  itemLabel = "tenders",
}: PaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const atStart = page <= 1;
  const atEnd = page >= totalPages;

  function linkProps(target: number) {
    const href = buildHref(target);
    if (!onNavigate) return { href };
    return {
      href,
      onClick: (event: MouseEvent<HTMLAnchorElement>) => {
        if (
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        onNavigate(href);
      },
    };
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-border sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={atStart}
          className={cn("px-2.5", atStart && "pointer-events-none opacity-50")}
        >
          <Link
            {...linkProps(1)}
            aria-label="First page"
            title="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="hidden sm:inline">First</span>
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={atStart}
          className={cn(atStart && "pointer-events-none opacity-50")}
        >
          <Link
            {...linkProps(Math.max(1, page - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Previous</span>
          </Link>
        </Button>
        <span className="min-w-16 px-1 text-center text-sm font-medium tabular-nums">
          {page} / {totalPages}
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={atEnd}
          className={cn(atEnd && "pointer-events-none opacity-50")}
        >
          <Link
            {...linkProps(Math.min(totalPages, page + 1))}
            aria-label="Next page"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={atEnd}
          className={cn("px-2.5", atEnd && "pointer-events-none opacity-50")}
        >
          <Link
            {...linkProps(totalPages)}
            aria-label="Last page"
            title="Last page"
          >
            <span className="hidden sm:inline">Last</span>
            <ChevronsRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
