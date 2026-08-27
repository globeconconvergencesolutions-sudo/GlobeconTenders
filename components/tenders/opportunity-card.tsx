"use client";

import type { CustomFieldDefinition } from "@/lib/db/schema";
import type { TenderWithSource } from "@/lib/db/schema";

import { HrOpportunityCard } from "@/components/tenders/hr-opportunity-card";
import { ProcurementOpportunityCard } from "@/components/tenders/procurement-opportunity-card";
import {
  useFeatures,
  useLayout,
  useOrg,
} from "@/components/providers/org-context-provider";

type OpportunityCardProps = {
  tender: TenderWithSource;
  canSave?: boolean;
  canShare?: boolean;
  customFieldDefinitions?: CustomFieldDefinition[];
};

export function OpportunityCard({
  tender,
  canSave = false,
  canShare = false,
  customFieldDefinitions,
}: OpportunityCardProps) {
  const layout = useLayout();
  const features = useFeatures();
  const { customFields: templateFields } = useOrg();
  const definitions = customFieldDefinitions ?? templateFields;

  if (layout.homeCardVariant === "hr") {
    return (
      <HrOpportunityCard
        tender={tender}
        canSave={canSave}
        canShare={canShare}
        customFieldDefinitions={definitions}
        showMatchScore={features.matchScore}
      />
    );
  }

  return (
    <ProcurementOpportunityCard
      tender={tender}
      canSave={canSave}
      canShare={canShare}
      customFieldDefinitions={definitions}
      showMatchScore={features.matchScore}
    />
  );
}
