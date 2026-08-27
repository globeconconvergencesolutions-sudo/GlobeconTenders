"use client";

import {
  CalendarClock,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Loader2,
  MapPin,
  Share2,
  Tag,
} from "lucide-react";
import { useState } from "react";

import { AppLogo } from "@/components/brand/app-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PublicTenderView } from "@/lib/tenders/share";
import {
  listingStateBadgeLabel,
  opportunityTiming,
  timingBarClass,
  timingTextClass,
  type ListingState,
} from "@/lib/tenders/lifecycle";
import { getCardCustomFields } from "@/lib/templates/custom-fields";
import type { SharePresentation } from "@/lib/tenant/org-context";
import { cn, formatDeadline } from "@/lib/utils";

type PublicTenderViewProps = {
  tender: PublicTenderView;
  presentation: SharePresentation;
  expiresAt?: string;
};

export function PublicTenderViewPanel({
  tender,
  presentation,
  expiresAt,
}: PublicTenderViewProps) {
  const { branding, lexicon, layout, features } = presentation;
  const isHr = layout.homeCardVariant === "hr";
  const timing = opportunityTiming(tender.deadline, {
    listingState: (tender.listingState as ListingState | null) ?? null,
    sourceStatus: tender.sourceStatus,
    hasHardDeadline: tender.hasHardDeadline,
  });
  const listingBadge = listingStateBadgeLabel(
    (tender.listingState as ListingState | null) ?? null,
  );
  const progress =
    timing.tone === "expired" ||
    timing.tone === "closed" ||
    timing.tone === "stale"
      ? 100
      : timing.tone === "rolling"
        ? 12
        : Math.min(100, Math.max(8, (timing.daysLeft / 30) * 100));
  const location = [
    tender.countryLabel ?? tender.countryName,
    tender.regionLabel ?? tender.regionName,
  ]
    .filter(Boolean)
    .join(", ");
  const extraFields = getCardCustomFields(
    presentation.customFields,
    tender.customFields,
  );
  const categoryLabel = isHr ? lexicon.category : "Category";
  const deadlineLabel = lexicon.deadline;
  const matchedLabel = isHr
    ? `Relevant ${lexicon.categoryPlural.toLowerCase()}`
    : `Relevant ${lexicon.categoryPlural.toLowerCase()}`;

  return (
    <div
      className={cn(
        "min-h-dvh w-full",
        isHr
          ? "bg-[radial-gradient(circle_at_top,_#7c3aed22,_transparent_55%),linear-gradient(180deg,#faf5ff_0%,#f5f3ff_100%)]"
          : "bg-[radial-gradient(circle_at_top,_#1e3a8a22,_transparent_55%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)]",
      )}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 py-8 sm:px-6 sm:py-12">
        <header className="mb-8 flex items-center justify-between gap-4">
          <AppLogo
            size="sm"
            variant="login"
            brandingOverride={branding}
            textClassName="[&_p:first-child]:text-slate-900 [&_p:last-child]:text-blue-700/80"
          />
          <Badge
            variant="outline"
            className={cn(
              "bg-white/80",
              isHr
                ? "border-violet-200 text-violet-700"
                : "border-blue-200 text-blue-700",
            )}
          >
            Shared preview
          </Badge>
        </header>

        <main className="flex-1">
          <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 shadow-2xl shadow-blue-950/10 backdrop-blur-sm">
            <div
              className="h-2 w-full"
              style={{
                backgroundColor: isHr ? branding.primaryColor : tender.sourceColor,
              }}
              aria-hidden
            />

            <div className="space-y-6 p-6 sm:p-8">
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  className="border-transparent font-medium text-white"
                  style={{ backgroundColor: tender.sourceColor }}
                >
                  {tender.sourceName}
                </Badge>
                <span className="text-xs font-medium text-slate-500">
                  {tender.referenceId}
                </span>
                {features.matchScore && tender.matchScore > 0 && (
                  <Badge variant="secondary" className="font-normal tabular-nums">
                    {lexicon.matchScore}: {tender.matchScore}
                  </Badge>
                )}
                {(listingBadge ||
                  tender.isClosed ||
                  timing.tone === "expired") && (
                  <Badge variant="secondary" className="font-normal">
                    {listingBadge ??
                      (timing.tone === "expired" ? "Expired" : "Closed")}
                  </Badge>
                )}
              </div>

              <div>
                <h1 className="text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                  {tender.title}
                </h1>
                {!isHr && (
                  <p className="mt-2 text-sm text-slate-500">{tender.projectLabel}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <CalendarClock className="h-4 w-4" />
                    {deadlineLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDeadline(tender.deadline)}
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-xs font-medium",
                      timingTextClass(timing.tone),
                    )}
                  >
                    {timing.label}
                  </p>
                  {timing.tone !== "expired" &&
                    timing.tone !== "closed" &&
                    !tender.isClosed && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={cn("h-full rounded-full", timingBarClass(timing.tone))}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                    <Tag className="h-4 w-4" />
                    {categoryLabel}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {tender.category}
                  </p>
                  {location && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 shrink-0" />
                      {location}
                    </p>
                  )}
                </div>
              </div>

              {extraFields.length > 0 && (
                <section className="grid gap-3 sm:grid-cols-2">
                  {extraFields.map((field) => (
                    <div
                      key={field.key}
                      className="rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3"
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                        {field.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {field.display}
                      </p>
                    </div>
                  ))}
                </section>
              )}

              {tender.description && (
                <section className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-4">
                  <h2 className="text-sm font-semibold text-slate-900">Overview</h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                    {tender.description}
                  </p>
                </section>
              )}

              {tender.matchedServiceLines.length > 0 && (
                <section>
                  <h2 className="mb-2 text-sm font-semibold text-slate-900">
                    {matchedLabel}
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {tender.matchedServiceLines.map((line) => (
                      <Badge key={line} variant="secondary" className="font-normal">
                        {line}
                      </Badge>
                    ))}
                  </div>
                </section>
              )}

              {tender.url ? (
                <a
                  href={tender.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-sm font-semibold text-white shadow-lg sm:w-auto"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  {isHr ? "View job posting" : "View original notice"}
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  The original link is not available for this{" "}
                  {lexicon.opportunity.toLowerCase()}.
                </p>
              )}
            </div>
          </article>
        </main>

        <footer className="mt-8 space-y-2 text-center text-xs text-slate-500">
          <p className="inline-flex items-center gap-1.5">
            <Globe2 className="h-3.5 w-3.5" />
            Shared via {branding.displayName} {branding.productTagline}
          </p>
          <p>This is a read-only preview. Sign-in is not available from this page.</p>
          {expiresAt && (
            <p>
              Link expires{" "}
              {new Date(expiresAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

type ShareTenderButtonProps = {
  tenderId: number;
  tenderTitle: string;
};

export function ShareTenderButton({
  tenderId,
  tenderTitle,
}: ShareTenderButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createShareLink() {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      const response = await fetch(`/api/tenders/${tenderId}/share`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Share failed");
      }
      setShareUrl(data.shareUrl);
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Share failed");
    } finally {
      setLoading(false);
    }
  }

  async function copyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Could not copy link");
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void createShareLink()}
        disabled={loading}
        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-blue-600"
        aria-label={`Share ${tenderTitle}`}
        title="Share link"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Share2 className="h-4 w-4" />
        )}
      </button>

      {open && shareUrl && (
        <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="text-xs font-semibold text-slate-900">Share link ready</p>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
            Anyone with this link can view this item only — no access to the main
            system.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-700"
            />
            <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-2 text-[11px] text-slate-500 hover:text-slate-700"
          >
            Close
          </button>
        </div>
      )}

      {error && (
        <p className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
