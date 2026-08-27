"use client";

import { Ban, Check, Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  ROLE_BADGE_CLASS,
  type RoleGuide,
  getRoleGuide,
  listRoleGuides,
} from "@/lib/auth/role-guide";
import { assignableRoles } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

export function RoleScopePreview({ role }: { role: UserRole }) {
  const guide = getRoleGuide(role);
  return <RoleGuideBody guide={guide} compact />;
}

export function RoleAccessGuide({ actorRole }: { actorRole: UserRole }) {
  const assignable = new Set(assignableRoles(actorRole));
  const guides = listRoleGuides();

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-border dark:bg-card">
      <div className="border-b border-slate-100 px-5 py-4 dark:border-border">
        <h2 className="text-lg font-semibold">Role access</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each role opens a fixed set of pages. Assign the smallest role that
          can do the job — you cannot grant pages that sit outside that role.
        </p>
      </div>
      <div className="grid gap-px bg-slate-100 dark:bg-border sm:grid-cols-2">
        {guides.map((guide) => {
          const canAssign = assignable.has(guide.role);
          return (
            <article
              key={guide.role}
              className="flex flex-col bg-white p-5 dark:bg-card"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className={cn("font-normal", ROLE_BADGE_CLASS[guide.role])}
                >
                  {guide.label}
                </Badge>
                <span className="text-xs font-medium text-muted-foreground">
                  {guide.tagline}
                </span>
                {!canAssign && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                    <Lock className="h-3 w-3" />
                    You cannot assign this
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {guide.summary}
              </p>
              <RoleGuideBody guide={guide} compact />
            </article>
          );
        })}
      </div>
    </section>
  );
}

function RoleGuideBody({
  guide,
  compact = false,
}: {
  guide: RoleGuide;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-3", compact ? "mt-3" : "mt-4")}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Pages
        </p>
        <ul className="mt-1 space-y-0.5 text-sm">
          {guide.pages.map((page) => (
            <li key={page.href} className="text-slate-700 dark:text-slate-200">
              {page.label}
              {page.note ? (
                <span className="text-muted-foreground"> — {page.note}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            <Check className="h-3 w-3" />
            Can
          </p>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {guide.can.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
            <Ban className="h-3 w-3" />
            Cannot
          </p>
          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
            {guide.cannot.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
