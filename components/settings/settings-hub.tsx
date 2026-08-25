"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  CreditCard,
  ImageIcon,
  Languages,
  Layers,
  Loader2,
  Palette,
  ShieldCheck,
} from "lucide-react";

import { cn } from "@/lib/utils";

type HubProps = {
  canManageSettings: boolean;
};

type HubSnapshot = {
  notifications?: {
    enabled: boolean;
    includedCount: number;
  };
  branding?: {
    displayName: string;
    hasLogo: boolean;
    hasCover: boolean;
    primaryColor: string;
  };
  template?: {
    name: string;
    version: string;
  };
  plan?: {
    label: string;
    seats: string;
    sources: string;
    status: string;
  };
};

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 dark:border-border dark:bg-card">
      <div className="h-8 w-8 rounded-xl bg-slate-100 dark:bg-white/10" />
      <div className="mt-4 h-4 w-28 rounded bg-slate-100 dark:bg-white/10" />
      <div className="mt-2 h-3 w-full rounded bg-slate-100 dark:bg-white/10" />
      <div className="mt-1 h-3 w-2/3 rounded bg-slate-100 dark:bg-white/10" />
    </div>
  );
}

function HubCard({
  href,
  icon: Icon,
  iconClass,
  title,
  status,
  description,
  meta,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  status?: string;
  description: string;
  meta?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300 hover:shadow-md dark:border-border dark:bg-card dark:hover:border-white/15"
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-xl",
            iconClass,
          )}
        >
          <Icon className="h-4.5 w-4.5 h-4 w-4" />
        </span>
        {status && (
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
            {status}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-slate-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {meta && <div className="mt-4">{meta}</div>}
      <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 transition group-hover:gap-1.5 dark:text-blue-300">
        Open
        <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

export function SettingsHub({ canManageSettings }: HubProps) {
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<HubSnapshot>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const next: HubSnapshot = {};

      const notifRes = await fetch("/api/settings/notifications");
      if (notifRes.ok) {
        const data = await notifRes.json();
        next.notifications = {
          enabled: data.notifications?.enabled !== false,
          includedCount: data.includedCount ?? data.notifications?.includedUserIds?.length ?? 0,
        };
      }

      if (canManageSettings) {
        const [brandRes, templateRes, planRes] = await Promise.all([
          fetch("/api/settings/branding"),
          fetch("/api/settings/template"),
          fetch("/api/settings/plan"),
        ]);

        if (brandRes.ok) {
          const data = await brandRes.json();
          next.branding = {
            displayName:
              data.resolved?.displayName ?? data.organizationName ?? "Workspace",
            hasLogo: Boolean(data.branding?.logoUrl || data.resolved?.logoUrl),
            hasCover: Boolean(data.branding?.coverUrl || data.resolved?.coverUrl),
            primaryColor:
              data.resolved?.primaryColor ??
              data.branding?.primaryColor ??
              "#2563eb",
          };
        }

        if (templateRes.ok) {
          const data = await templateRes.json();
          next.template = {
            name: data.template?.name ?? data.orgTemplateId ?? "Template",
            version: data.template?.version ?? data.orgTemplateVersion ?? "",
          };
        }

        if (planRes.ok) {
          const data = await planRes.json();
          next.plan = {
            label: data.plan?.label ?? data.organization?.plan ?? "Plan",
            seats: `${data.usage?.seats ?? 0} / ${data.organization?.maxSeats ?? "—"}`,
            sources: `${data.usage?.sources ?? 0} / ${data.organization?.maxSources ?? "—"}`,
            status: data.organization?.status ?? "active",
          };
        }
      }

      setSnapshot(next);
    } finally {
      setLoading(false);
    }
  }, [canManageSettings]);

  useEffect(() => {
    void load();
  }, [load]);

  const brandingComplete =
    snapshot.branding?.hasLogo && Boolean(snapshot.branding.displayName);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-blue-600/80 dark:text-blue-300/80">
          Workspace control center
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
          Settings hub
        </h2>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Jump into the area you need. Cards reflect live configuration so you
          can see what still needs attention.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          {canManageSettings && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <HubCard
            href="/settings/notifications"
            icon={Bell}
            iconClass="bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300"
            title="Notifications"
            status={
              snapshot.notifications?.enabled === false ? "Paused" : "Active"
            }
            description="Choose who receives closing-soon and digest alerts from this workspace."
            meta={
              <p className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold tabular-nums">
                  {snapshot.notifications?.includedCount ?? 0}
                </span>{" "}
                recipients on the list
              </p>
            }
          />

          {canManageSettings && (
            <>
              <HubCard
                href="/settings/delegations"
                icon={ShieldCheck}
                iconClass="bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300"
                title="Delegations"
                description="Let trusted teammates manage alert recipients without full admin access."
              />

              <HubCard
                href="/settings/branding"
                icon={Palette}
                iconClass="bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"
                title="Branding"
                status={brandingComplete ? "Ready" : "Needs attention"}
                description="Logo, login cover, colors, and display name across the product."
                meta={
                  snapshot.branding ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="h-3 w-3 rounded-full ring-2 ring-white dark:ring-slate-900"
                        style={{
                          backgroundColor: snapshot.branding.primaryColor,
                        }}
                      />
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
                        {snapshot.branding.displayName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        {snapshot.branding.hasLogo ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Logo
                          </>
                        ) : (
                          <>
                            <ImageIcon className="h-3 w-3" />
                            No logo
                          </>
                        )}
                        <span className="text-slate-300">·</span>
                        {snapshot.branding.hasCover ? "Cover set" : "No cover"}
                      </span>
                    </div>
                  ) : null
                }
              />

              <HubCard
                href="/settings/lexicon"
                icon={Languages}
                iconClass="bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                title="Terminology"
                description="Customize how opportunities, sources, and navigation are labeled."
              />

              <HubCard
                href="/settings/template"
                icon={Layers}
                iconClass="bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"
                title="Template"
                status={snapshot.template?.version || undefined}
                description="Vertical defaults for features, layout, and catalog seeding."
                meta={
                  snapshot.template ? (
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {snapshot.template.name}
                    </p>
                  ) : null
                }
              />

              <HubCard
                href="/settings/plan"
                icon={CreditCard}
                iconClass="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300"
                title="Plan & usage"
                status={snapshot.plan?.status}
                description="Seats, sources, sync cadence, and upgrade options."
                meta={
                  snapshot.plan ? (
                    <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
                      <p className="font-semibold text-slate-800 dark:text-slate-100">
                        {snapshot.plan.label}
                      </p>
                      <p>
                        Seats {snapshot.plan.seats} · Sources{" "}
                        {snapshot.plan.sources}
                      </p>
                    </div>
                  ) : null
                }
              />
            </>
          )}
        </div>
      )}

      {loading && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Loading workspace snapshot…
        </p>
      )}
    </div>
  );
}
