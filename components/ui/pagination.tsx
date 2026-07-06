"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  buildHref: (page: number) => string;
};

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  buildHref,
}: PaginationProps) {
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 dark:border-border sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {start}–{end} of {total} tenders
      </p>
      <div className="flex items-center gap-2">
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={page <= 1}
          className={cn(page <= 1 && "pointer-events-none opacity-50")}
        >
          <Link href={buildHref(Math.max(1, page - 1))}>
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>
        </Button>
        <span className="min-w-16 text-center text-sm font-medium">
          {page} / {totalPages}
        </span>
        <Button
          asChild
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          className={cn(page >= totalPages && "pointer-events-none opacity-50")}
        >
          <Link href={buildHref(Math.min(totalPages, page + 1))}>
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
