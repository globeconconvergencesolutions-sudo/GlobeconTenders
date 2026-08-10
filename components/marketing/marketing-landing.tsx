import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle2,
  Globe2,
  Layers,
  RefreshCw,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import {
  PLATFORM_PRODUCT_NAME,
  PLATFORM_STAGING_HOST,
  PLATFORM_WORKSPACE_HOST,
  getWorkspaceHostLabel,
} from "@/lib/tenant/config";
import { listTemplateSummaries } from "@/lib/templates/load";

const FEATURES = [
  {
    icon: RefreshCw,
    title: "Live source sync",
    description:
      "Connect World Bank, AfDB, RSS feeds, and document bulletins. Sync on demand or on schedule.",
  },
  {
    icon: Zap,
    title: "Smart matching",
    description:
      "Score opportunities against your categories, regions, and keywords — see what matters first.",
  },
  {
    icon: Users,
    title: "Team workspaces",
    description:
      "Role-based access for admins, analysts, and viewers. Invite your team in minutes.",
  },
  {
    icon: Layers,
    title: "Vertical templates",
    description:
      "Launch as procurement intelligence, HR careers hub, or customize terminology and layout.",
  },
  {
    icon: BarChart3,
    title: "Analytics & exports",
    description:
      "Track pipeline metrics, export CSV, and share read-only shortlists with stakeholders.",
  },
  {
    icon: Shield,
    title: "Tenant isolation",
    description:
      "Every organization gets isolated data, branding, and settings on a shared secure platform.",
  },
];

const PLANS = [
  {
    name: "Trial",
    price: "Free",
    period: "14 days",
    highlights: ["5 seats", "5 sources", "Daily sync", "All templates"],
  },
  {
    name: "Starter",
    price: "Contact",
    period: "per month",
    highlights: ["10 seats", "15 sources", "Daily sync", "Email support"],
    featured: true,
  },
  {
    name: "Pro",
    price: "Contact",
    period: "per month",
    highlights: ["25 seats", "50 sources", "Hourly sync", "Priority support"],
  },
];

export function MarketingLanding() {
  const templates = listTemplateSummaries();
  const workspaceHost = getWorkspaceHostLabel();

  return (
    <div className="min-h-dvh bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="pointer-events-none fixed -left-32 top-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="pointer-events-none fixed bottom-0 right-0 h-96 w-96 rounded-full bg-indigo-500/10 blur-3xl" />

      <header className="relative z-10 border-b border-white/5 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <AppLogo size="md" variant="login" />
          <nav className="hidden items-center gap-6 text-sm text-slate-400 md:flex">
            <a href="#features" className="transition-colors hover:text-white">
              Features
            </a>
            <a href="#templates" className="transition-colors hover:text-white">
              Templates
            </a>
            <a href="#pricing" className="transition-colors hover:text-white">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-slate-300 hover:text-white">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild className="bg-blue-600 hover:bg-blue-500">
              <Link href="/signup">
                Start free trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 md:pt-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-200">
              <Sparkles className="h-4 w-4" />
              {PLATFORM_PRODUCT_NAME} — multi-tenant SaaS
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.1]">
              Monitor opportunities.
              <span className="block bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                In your brand. Your language.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              Configure your organization from a template, sync tenders or job openings
              from your sources, score them against your priorities, and alert your team —
              all from one workspace.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 bg-blue-600 px-8 hover:bg-blue-500">
                <Link href="/signup">
                  Create your workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 border-slate-700 bg-transparent px-8 text-slate-200 hover:bg-white/5"
              >
                <Link href="/login">Sign in to existing workspace</Link>
              </Button>
            </div>
            <p className="mt-6 text-sm text-slate-500">
              14-day free trial · No credit card · Sign in with your workspace ID at{" "}
              <code className="rounded bg-white/5 px-1.5 py-0.5 text-slate-400">
                {workspaceHost}/login
              </code>
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3">
            {[
              { label: "Templates", value: String(templates.length), sub: "verticals live" },
              { label: "Setup time", value: "< 5 min", sub: "to first sync" },
              { label: "Isolation", value: "100%", sub: "org-scoped data" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center backdrop-blur-sm"
              >
                <p className="text-3xl font-semibold text-white">{stat.value}</p>
                <p className="mt-1 text-sm font-medium text-slate-300">{stat.label}</p>
                <p className="text-xs text-slate-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="border-t border-white/5 bg-slate-900/50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Everything you need to run a tender or careers desk
              </h2>
              <p className="mt-3 text-slate-400">
                Built for consulting firms, HR teams, and organizations tracking external
                opportunities.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-6 transition-colors hover:border-blue-500/30 hover:bg-slate-950"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-400">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="templates" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Start from a template
                </h2>
                <p className="mt-3 max-w-xl text-slate-400">
                  Each template ships with terminology, catalog seeds, sidebar layout, and
                  card styling — so day one already feels like your product.
                </p>
              </div>
              <Button asChild variant="outline" className="border-slate-700 text-slate-200">
                <Link href="/signup">Pick a template at signup</Link>
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="group rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 to-slate-950 p-8 transition-all hover:border-blue-500/40"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                      <Building2 className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold">{template.name}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="border-t border-white/5 bg-slate-900/50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Simple, transparent plans
              </h2>
              <p className="mt-3 text-slate-400">
                Start free. Upgrade when your team and sources grow.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl border p-8 ${
                    plan.featured
                      ? "border-blue-500/50 bg-blue-500/5 shadow-lg shadow-blue-500/10"
                      : "border-white/10 bg-slate-950/60"
                  }`}
                >
                  {plan.featured && (
                    <span className="mb-4 inline-block rounded-full bg-blue-500/20 px-3 py-1 text-xs font-medium text-blue-200">
                      Most popular
                    </span>
                  )}
                  <h3 className="text-xl font-semibold">{plan.name}</h3>
                  <p className="mt-2">
                    <span className="text-3xl font-semibold">{plan.price}</span>
                    <span className="text-slate-500"> {plan.period}</span>
                  </p>
                  <ul className="mt-6 space-y-3">
                    {plan.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-slate-500">
              Enterprise plans with unlimited seats and custom sync —{" "}
              <a
                href="mailto:support@globeconcs.com"
                className="text-blue-400 underline underline-offset-2"
              >
                contact sales
              </a>
            </p>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <Globe2 className="mx-auto h-10 w-10 text-blue-400" />
            <h2 className="mt-6 text-3xl font-semibold tracking-tight">
              Ready to launch your workspace?
            </h2>
            <p className="mt-4 text-slate-400">
              Sign up in minutes. Your team gets a dedicated subdomain on{" "}
              {PLATFORM_STAGING_HOST} today, with cutover to {PLATFORM_WORKSPACE_HOST} when
              DNS is ready.
            </p>
            <Button asChild size="lg" className="mt-8 h-12 bg-blue-600 px-10 hover:bg-blue-500">
              <Link href="/signup">
                Start your 14-day trial
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-slate-500 sm:flex-row">
          <p>© {new Date().getFullYear()} {PLATFORM_PRODUCT_NAME}</p>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-slate-300">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-slate-300">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
