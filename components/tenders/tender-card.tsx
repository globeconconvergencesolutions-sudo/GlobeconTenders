"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock, ExternalLink, Heart, Loader2 } from "lucide-react";

import { ShareTenderButton } from "@/components/share/public-tender-view";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { TenderWithSource } from "@/lib/db/schema";
import {
  cn,
  daysUntil,
  formatDeadline,
  urgencyColor,
  urgencyTextColor,
} from "@/lib/utils";

type TenderCardProps = {
  tender: TenderWithSource;
  canSave?: boolean;
};

export function TenderCard({ tender, canSave = false }: TenderCardProps) {
  const router = useRouter();
  const [saved, setSaved] = useState(tender.saved);
  const [saving, setSaving] = useState(false);
  const daysLeft = daysUntil(tender.deadline);
  const progress = Math.min(100, Math.max(8, (daysLeft / 30) * 100));

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
    <Card className="flex flex-col border-slate-200 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-transparent font-medium text-white"
              style={{ backgroundColor: tender.sourceColor }}
            >
              {tender.sourceName}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {tender.referenceId}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ShareTenderButton tenderId={tender.id} tenderTitle={tender.title} />
            <button
              type="button"
              className={cn(
                "rounded-md p-1 text-muted-foreground transition-colors",
                canSave && "hover:bg-slate-100 hover:text-red-500",
                !canSave && "cursor-default opacity-60",
              )}
              aria-label={saved ? "Unsave tender" : "Save tender"}
              disabled={!canSave || saving}
              onClick={toggleSaved}
            >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Heart
                className={cn(
                  "h-4 w-4",
                  saved && "fill-red-500 text-red-500",
                )}
              />
            )}
            </button>
          </div>
        </div>

        <h3 className="mb-3 line-clamp-3 flex-1 text-sm font-semibold leading-snug text-foreground">
          {tender.title}
        </h3>

        <div className="mb-4 space-y-2">
          <p className="text-xs text-muted-foreground">{tender.projectLabel}</p>
          <Badge variant="secondary" className="font-normal">
            {tender.category}
          </Badge>
        </div>

        <div className="mt-auto space-y-2 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Deadline: {formatDeadline(tender.deadline)}
            </span>
            <span
              className={cn("font-medium", urgencyTextColor(daysLeft))}
            >
              {daysLeft}d left
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn("h-full rounded-full transition-all", urgencyColor(daysLeft))}
              style={{ width: `${progress}%` }}
            />
          </div>
          {tender.url && (
            <a
              href={tender.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
            >
              View original notice
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
