import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  FileSearch,
  Globe2,
  ListChecks,
  Scale,
  Shield,
} from "lucide-react";

import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import {
  PLATFORM_PRODUCT_NAME,
  getWorkspaceHostLabel,
} from "@/lib/tenant/config";

const FEATURES = [
  {
    icon: ListChecks,
    title: "Your markets",
    description:
      "Thirty-eight fields, from software and roads to healthcare and agriculture. You choose the ones your firm works in. The list follows that choice.",
  },
  {
    icon: Globe2,
    title: "Public invitations",
    description:
      "World Bank, African Development Bank, UNDP, Kenya PPIP, and TenderYetu. Each source says where it is read. The list does not claim to cover the whole internet.",
  },
  {
    icon: Building2,
    title: "Your answers",
    description:
      "Company holds the experience, people, and certificates a tender asks for. Evidence holds the file or the link that proves it.",
  },
  {
    icon: Scale,
    title: "One comparison",
    description:
      "Open an invitation and compare it with your company. If a certificate is not uploaded yet, the result says the proof is missing. That does not mean you cannot do the work. A word count is not a decision to bid.",
  },
  {
    icon: FileSearch,
    title: "What is missing",
    description:
      "Gaps lists what a comparison could not match. Pipeline is where you accept the work and move it forward. Discovered means nobody has taken it on yet.",
  },
  {
    icon: Shield,
    title: "Your workspace",
    description:
      "Each firm has its own markets, profile, and team. Admins, analysts, and viewers share one desk.",
  },
];

const EXAMPLES = [
  "ICT & Software",
  "Roads & civil works",
  "Healthcare",
  "Agriculture",
  "Construction",
  "Human resources",
];

const PLANS = [
  {
    name: "Trial",
    price: "Free",
    period: "14 days",
    highlights: ["5 seats", "5 sources", "Daily sync", "All 38 markets"],
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
            <a href="#how" className="transition-colors hover:text-white">
              How it works
            </a>
            <a href="#markets" className="transition-colors hover:text-white">
              Markets
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
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-sm text-blue-200">
              {PLATFORM_PRODUCT_NAME}
            </p>
            <h1 className="text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.1]">
              See the invitations that fit your firm.
              <span className="mt-2 block bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                Then decide if you can bid.
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
              A tender is a public invitation to bid. Choose your markets, keep the proof a
              buyer asks for, and compare one invitation with your company before anyone
              commits to the work.
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
                <Link href="/login">Sign in</Link>
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
              { label: "Markets", value: "38", sub: "choose the ones you do" },
              { label: "After signup", value: "1 step", sub: "pick your markets" },
              { label: "The check", value: "1 notice", sub: "compared with your firm" },
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

        <section id="how" className="border-t border-white/5 bg-slate-900/50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight">How a firm uses it</h2>
              <p className="mt-3 text-slate-400">
                The same path fits a software firm, a roads contractor, or a hospital supplier.
                The markets change. The pages do not.
              </p>
            </div>
            <ol className="grid gap-6 md:grid-cols-3">
              {[
                {
                  step: "1",
                  title: "Choose markets",
                  body: "After you register, pick the fields you bid in. Human resources is one of those fields, for firms that sell recruitment or HR services.",
                },
                {
                  step: "2",
                  title: "Describe the firm",
                  body: "Company is where you write what your firm does. Evidence is where you upload the certificate or paste the link. A comparison uses both.",
                },
                {
                  step: "3",
                  title: "Decide on one invitation",
                  body: "Compare an invitation with your company. Gaps shows what did not match. Pipeline is only the work you accept.",
                },
              ].map((item) => (
                <li
                  key={item.step}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-6"
                >
                  <p className="text-sm font-medium text-blue-300">Step {item.step}</p>
                  <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="markets" className="py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-10 max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tight">A shared list of markets</h2>
              <p className="mt-3 text-slate-400">
                You do not get every field on day one. You search, you pick, and Tenders follows
                that watchlist. A few of the fields:
              </p>
            </div>
            <ul className="flex flex-wrap gap-3">
              {EXAMPLES.map((name) => (
                <li
                  key={name}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-slate-200"
                >
                  {name}
                </li>
              ))}
              <li className="rounded-full border border-dashed border-white/15 px-4 py-2 text-sm text-slate-400">
                and 32 more inside the workspace
              </li>
            </ul>
            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-6"
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

        <section id="pricing" className="border-t border-white/5 bg-slate-900/50 py-20">
          <div className="mx-auto max-w-6xl px-6">
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Plans</h2>
              <p className="mt-3 text-slate-400">Start free. Upgrade when the team and the sources grow.</p>
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
              Enterprise plans —{" "}
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
            <h2 className="text-3xl font-semibold tracking-tight">Register, then choose your markets</h2>
            <p className="mt-4 text-slate-400">
              The first screen after sign-in asks what work you want to see. Until you answer,
              the tender list waits.
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
