"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { HelpMark } from "@/components/pis/help-mark";
import { cn } from "@/lib/utils";

export function PageShell({
  title,
  lede,
  action,
  wide = false,
  helpLink = true,
  children,
}: {
  title: string;
  lede: string;
  action?: ReactNode;
  wide?: boolean;
  helpLink?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="pis-page min-h-full bg-slate-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className={cn("space-y-10", wide ? "" : "mx-auto max-w-6xl")}>
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-balance break-words text-3xl font-semibold tracking-tight text-slate-900">
                {title}
              </h1>
              <p className="mt-3 text-base leading-relaxed text-slate-600">{lede}</p>
            </div>
            {helpLink && <HelpMark className="mt-1" />}
          </div>
          {action}
        </header>
        {children}
      </div>
    </div>
  );
}

export function SectionCard({
  title,
  lede,
  children,
}: {
  title?: string;
  lede?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      {title && <h2 className="text-lg font-semibold text-slate-900">{title}</h2>}
      {lede && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">{lede}</p>}
      <div className={title || lede ? "mt-6" : ""}>{children}</div>
    </section>
  );
}

const PILL: Record<string, string> = {
  ready: "bg-emerald-50 text-emerald-800",
  missing: "bg-amber-50 text-amber-900",
  calm: "bg-slate-100 text-slate-700",
  bad: "bg-rose-50 text-rose-800",
  info: "bg-sky-50 text-sky-900",
};

export function StatusPill({
  children,
  tone = "calm",
}: {
  children: ReactNode;
  tone?: keyof typeof PILL;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium",
        PILL[tone],
      )}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  children,
  actionHref,
  actionLabel,
}: {
  children: ReactNode;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center">
      <p className="mx-auto max-w-md text-sm leading-relaxed text-slate-600">{children}</p>
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-4 inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  );
}
