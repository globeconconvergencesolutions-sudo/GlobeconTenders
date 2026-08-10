"use client";

import {
  BarChart3,  MapPin,
  RefreshCw,
  Shield,
} from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { useLexicon, useOrg } from "@/components/providers/org-context-provider";

export function LoginHero() {
  const { branding } = useOrg();
  const { t, lexicon } = useLexicon();

  const highlights = [
    {
      icon: RefreshCw,
      title: `Live ${lexicon.sourcePlural.toLowerCase()} sync`,
      description:
        "World Bank and custom sources updated on demand or on schedule.",
    },
    {
      icon: MapPin,
      title: `${t("region")} & ${lexicon.categoryPlural.toLowerCase()} filters`,
      description: `Focus on regions, countries, and ${branding.displayName} capabilities.`,
    },
    {
      icon: BarChart3,
      title: "Team dashboard",
      description: "Role-based access for analysts, admins, and leadership.",
    },
  ];

  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-slate-950 via-[#0b1530] to-slate-900 lg:flex lg:w-[52%] lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:48px_48px]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="relative">
        <AppLogo size="lg" variant="login" textClassName="[&_p:first-child]:text-lg" />
      </div>

      <div className="relative space-y-8">
        <div>
          <h1 className="max-w-lg text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">
            {lexicon.productTagline} for {branding.displayName} teams
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-slate-400">
            Track matching {lexicon.opportunityPlural.toLowerCase()}, filter by{" "}
            {lexicon.categoryPlural.toLowerCase()}, and sync opportunities before
            deadlines close.
          </p>
        </div>

        <ul className="space-y-5">
          {highlights.map(({ icon: Icon, title, description }) => (
            <li key={title} className="flex gap-4">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 ring-1 ring-white/10">
                <Icon className="h-4 w-4 text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-white">{title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="relative flex items-center gap-2 text-xs text-slate-500">
        <Shield className="h-3.5 w-3.5" />
        Secure access for authorized {branding.displayName} personnel
      </div>
    </div>
  );
}
