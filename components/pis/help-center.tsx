"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

import {
  GETTING_STARTED,
  HELP_FAQS,
  HELP_GUIDES,
  WHY_THIS_SYSTEM,
  helpUrl,
  type HelpSectionId,
} from "@/lib/pis/help-content";
import { cn } from "@/lib/utils";

const GROUPS: { label: string; ids: HelpSectionId[] }[] = [
  { label: "Start", ids: ["why", "tenders"] },
  { label: "Set up", ids: ["watchlists", "fields", "company", "evidence"] },
  { label: "Decide", ids: ["qualification", "gaps", "pipeline"] },
  { label: "Follow", ids: ["alerts", "sources", "market", "review"] },
];

const SECTIONS: { id: HelpSectionId; label: string }[] = [
  { id: "why", label: "Start here" },
  ...HELP_GUIDES.map((guide) => ({ id: guide.id, label: guide.title })),
];

function isSection(value: string | undefined): value is HelpSectionId {
  return SECTIONS.some((section) => section.id === value);
}

function labelFor(id: HelpSectionId) {
  return SECTIONS.find((section) => section.id === id)?.label ?? id;
}

export function HelpCenter({ initialSection }: { initialSection?: string }) {
  const router = useRouter();
  const articleRef = useRef<HTMLElement>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<HelpSectionId>(
    isSection(initialSection) ? initialSection : "why",
  );

  useEffect(() => {
    articleRef.current?.scrollTo({ top: 0 });
  }, [active]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const found: { id: string; title: string; snippet: string; section: HelpSectionId }[] = [];
    for (const guide of HELP_GUIDES) {
      const haystack = [guide.title, guide.summary, ...guide.steps.flatMap((step) => [step.title, step.body])]
        .join(" ")
        .toLowerCase();
      if (haystack.includes(q)) {
        found.push({ id: guide.id, title: guide.title, snippet: guide.summary, section: guide.id });
      }
    }
    for (const faq of HELP_FAQS) {
      const haystack = `${faq.question} ${faq.answer} ${faq.tags.join(" ")}`.toLowerCase();
      if (haystack.includes(q)) {
        found.push({ id: faq.id, title: faq.question, snippet: faq.answer, section: faq.sectionId });
      }
    }
    if (`${WHY_THIS_SYSTEM.title} ${WHY_THIS_SYSTEM.tagline}`.toLowerCase().includes(q)) {
      found.unshift({
        id: "why",
        title: WHY_THIS_SYSTEM.title,
        snippet: WHY_THIS_SYSTEM.tagline,
        section: "why",
      });
    }
    return found;
  }, [query]);

  const guide = HELP_GUIDES.find((item) => item.id === active);
  const order = GROUPS.flatMap((group) => group.ids);
  const index = order.indexOf(active);
  const previous = index > 0 ? order[index - 1] : null;
  const next = index >= 0 && index < order.length - 1 ? order[index + 1] : null;

  function choose(id: HelpSectionId) {
    setActive(id);
    setQuery("");
    router.replace(helpUrl(id), { scroll: false });
  }

  return (
    <div className="pis-page flex h-full min-h-0 flex-col bg-slate-50">
      <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Help</h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          New here? Start with the first guide. Each one names the button you will see on the page.
        </p>
        <label className="mt-4 block max-w-xl text-sm font-medium text-slate-800" htmlFor="help-search">
          Search the guides
        </label>
        <div className="relative mt-2 max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            id="help-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Try watchlist, score, evidence, or pipeline"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm"
          />
        </div>
        <nav aria-label="Help sections" className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => choose(section.id)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-2 text-sm",
                active === section.id
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700",
              )}
            >
              {section.label}
            </button>
          ))}
        </nav>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[16.5rem_minmax(0,1fr)]">
        <nav
          aria-label="Help sections"
          className="hidden min-h-0 overflow-y-auto border-r border-slate-200 bg-white px-3 py-4 lg:block"
        >
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.ids.map((id) => (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => choose(id)}
                      className={cn(
                        "w-full rounded-xl px-3 py-2.5 text-left text-sm",
                        active === id
                          ? "bg-blue-600 font-medium text-white"
                          : "text-slate-700 hover:bg-slate-100",
                      )}
                    >
                      {labelFor(id)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <article ref={articleRef} className="min-h-0 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-3xl">
            {query.trim() ? (
              <section>
                <h2 className="text-lg font-semibold text-slate-900">Matches</h2>
                <ul className="mt-4 space-y-3">
                  {results.length === 0 && (
                    <li className="rounded-2xl border border-dashed border-slate-300 bg-white px-5 py-6 text-sm leading-relaxed text-slate-600">
                      Nothing matched. Try watchlist, company, evidence, or pipeline.
                    </li>
                  )}
                  {results.map((result) => (
                    <li key={result.id}>
                      <button
                        type="button"
                        onClick={() => choose(result.section)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-4 text-left"
                      >
                        <span className="text-base font-medium text-slate-900">{result.title}</span>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">{result.snippet}</p>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ) : active === "why" ? (
              <GuideFrame
                title={WHY_THIS_SYSTEM.title}
                summary={WHY_THIS_SYSTEM.tagline}
                previous={previous}
                next={next}
                onChoose={choose}
              >
                <ul className="space-y-4">
                  {WHY_THIS_SYSTEM.pillars.map((pillar) => (
                    <li key={pillar.title} className="rounded-2xl bg-white px-5 py-5 shadow-sm">
                      <p className="text-base font-medium text-slate-900">{pillar.title}</p>
                      <p className="mt-2 text-base leading-relaxed text-slate-700">{pillar.body}</p>
                    </li>
                  ))}
                </ul>
                <h3 className="mt-8 text-lg font-semibold text-slate-900">A first afternoon</h3>
                <ol className="mt-4 space-y-4">
                  {GETTING_STARTED.map((step, stepIndex) => (
                    <li key={step.title} className="rounded-2xl bg-white px-5 py-5 shadow-sm">
                      <p className="text-base font-medium text-slate-900">
                        {stepIndex + 1}. {step.title}
                      </p>
                      <p className="mt-2 text-base leading-relaxed text-slate-700">{step.body}</p>
                      <Link href={step.href} className="mt-3 inline-block text-sm font-medium text-blue-700">
                        Open this page
                      </Link>
                    </li>
                  ))}
                </ol>
              </GuideFrame>
            ) : guide ? (
              <GuideFrame
                title={guide.title}
                summary={guide.summary}
                href={guide.href}
                previous={previous}
                next={next}
                onChoose={choose}
              >
                <ol className="space-y-4">
                  {guide.steps.map((step, stepIndex) => (
                    <li key={step.title} className="rounded-2xl bg-white px-5 py-5 shadow-sm">
                      <p className="text-base font-medium text-slate-900">
                        {stepIndex + 1}. {step.title}
                      </p>
                      <p className="mt-2 text-base leading-relaxed text-slate-700">{step.body}</p>
                    </li>
                  ))}
                </ol>
                <FaqList sectionId={guide.id} />
              </GuideFrame>
            ) : null}
          </div>
        </article>
      </div>
    </div>
  );
}

function GuideFrame({
  title,
  summary,
  href,
  previous,
  next,
  onChoose,
  children,
}: {
  title: string;
  summary: string;
  href?: string;
  previous: HelpSectionId | null;
  next: HelpSectionId | null;
  onChoose: (id: HelpSectionId) => void;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
      <p className="mt-3 text-base leading-relaxed text-slate-600">{summary}</p>
      {href && (
        <Link
          href={href}
          className="mt-5 inline-flex h-11 items-center rounded-xl bg-blue-600 px-5 text-sm font-medium text-white"
        >
          Open {title === "Start here" ? "Tenders" : title}
        </Link>
      )}
      <div className="mt-8">{children}</div>
      <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-between">
        {previous ? (
          <button type="button" onClick={() => onChoose(previous)} className="text-left text-sm text-blue-700">
            Previous: {labelFor(previous)}
          </button>
        ) : (
          <span />
        )}
        {next && (
          <button type="button" onClick={() => onChoose(next)} className="text-left text-sm font-medium text-blue-700 sm:text-right">
            Next: {labelFor(next)}
          </button>
        )}
      </div>
    </section>
  );
}

function FaqList({ sectionId }: { sectionId: HelpSectionId }) {
  const faqs = HELP_FAQS.filter((faq) => faq.sectionId === sectionId);
  if (faqs.length === 0) return null;
  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold text-slate-900">Questions people ask</h3>
      <ul className="mt-4 space-y-4">
        {faqs.map((faq) => (
          <li key={faq.id} className="rounded-2xl border border-slate-200 bg-white px-5 py-5">
            <p className="text-base font-medium text-slate-900">{faq.question}</p>
            <p className="mt-2 text-base leading-relaxed text-slate-700">{faq.answer}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
