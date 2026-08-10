"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Clock, ExternalLink, Heart, Loader2, MapPin } from "lucide-react";

import { useFeatures, useLexicon } from "@/components/providers/org-context-provider";
import { ShareTenderButton } from "@/components/share/public-tender-view";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomFieldDefinition, TenderWithSource } from "@/lib/db/schema";
import { getCardCustomFields } from "@/lib/templates/custom-fields";
import {
  cn,
  daysUntil,
  formatDeadline,
  urgencyTextColor,
} from "@/lib/utils";

type HrOpportunityCardProps = {
  tender: TenderWithSource;
  canSave?: boolean;
  customFieldDefinitions?: CustomFieldDefinition[];
  showMatchScore?: boolean;
};

export function HrOpportunityCard({
  tender,
  canSave = false,
  customFieldDefinitions = [],
  showMatchScore = true,
}: HrOpportunityCardProps) {
  const router = useRouter();
  const { t, lexicon } = useLexicon();
  const features = useFeatures();
  const [saved, setSaved] = useState(tender.saved);
  const [saving, setSaving] = useState(false);
  const daysLeft = daysUntil(tender.deadline);
  const location = [tender.countryLabel ?? tender.countryName, tender.regionLabel ?? tender.regionName]
    .filter(Boolean)
    .join(", ");
  const extraFields = getCardCustomFields(
    customFieldDefinitions,
    tender.customFields,
  );

  async function toggleSaved() {
    if (!canSave || saving) return;
    const next = !saved;
    setSaving(true);
    try {
      const response = await fetch(`/api/tenders/${tender.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved: next }),
      });
      if (response.ok) {
        setSaved(next);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="flex flex-col border-violet-200/80 shadow-sm transition-shadow hover:shadow-md dark:border-violet-900/40">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-transparent bg-violet-600 font-medium text-white hover:bg-violet-600">
              {tender.sourceName}
            </Badge>
            {showMatchScore && tender.matchScore > 0 && (
              <Badge variant="outline" className="font-normal tabular-nums">
                {t("matchScore")}: {tender.matchScore}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {features.publicShare && (
              <ShareTenderButton tenderId={tender.id} tenderTitle={tender.title} />
            )}
            <button
              type="button"
              className={cn(
                "rounded-md p-1 text-muted-foreground transition-colors",
                canSave && "hover:bg-violet-50 hover:text-violet-600",
                !canSave && "cursor-default opacity-60",
              )}
              aria-label={
                saved ? `Unsave ${t("opportunity").toLowerCase()}` : t("save")
              }
              disabled={!canSave || saving}
              onClick={toggleSaved}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Heart
                  className={cn(
                    "h-4 w-4",
                    saved && "fill-violet-500 text-violet-500",
                  )}
                />
              )}
            </button>
          </div>
        </div>

        <h3 className="mb-2 line-clamp-3 text-sm font-semibold leading-snug text-foreground">
          {tender.title}
        </h3>

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <Badge
            variant="secondary"
            className="gap-1 bg-violet-50 font-normal text-violet-900 dark:bg-violet-950/40 dark:text-violet-100"
          >
            <Briefcase className="h-3 w-3" />
            {tender.category}
          </Badge>
          {location && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {location}
            </span>
          )}
        </div>

        {extraFields.length > 0 && (
          <dl className="mb-4 grid gap-2 sm:grid-cols-2">
            {extraFields.map((field) => (
              <div
                key={field.key}
                className="rounded-lg border border-violet-100 bg-violet-50/50 px-3 py-2 dark:border-violet-900/30 dark:bg-violet-950/20"
              >
                <dt className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {field.label}
                </dt>
                <dd className="mt-0.5 text-xs font-medium text-foreground">
                  {field.display}
                </dd>
              </div>
            ))}
          </dl>
        )}

        <div className="mt-auto space-y-2 border-t border-violet-100 pt-4 dark:border-violet-900/30">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {t("deadline")}: {formatDeadline(tender.deadline)}
            </span>
            <span className={cn("font-medium", urgencyTextColor(daysLeft))}>
              {daysLeft}d left
            </span>
          </div>
          {tender.url && (
            <a
              href={tender.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:underline dark:text-violet-300"
            >
              View posting
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          <p className="text-[10px] text-muted-foreground">
            {lexicon.source}: {tender.sourceName}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
