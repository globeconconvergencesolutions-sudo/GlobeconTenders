"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleHelp } from "lucide-react";

import { helpSectionForPath, helpUrl } from "@/lib/pis/help-content";
import { cn } from "@/lib/utils";

export function HelpMark({ className }: { className?: string }) {
  const pathname = usePathname();
  const section = helpSectionForPath(pathname);
  const label = "Help for this page";

  return (
    <Link
      href={helpUrl(section)}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900",
        className,
      )}
    >
      <CircleHelp className="h-4 w-4" />
    </Link>
  );
}
