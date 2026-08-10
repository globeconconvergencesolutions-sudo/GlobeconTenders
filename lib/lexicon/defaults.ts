import type { WorkspaceLexiconSettings } from "@/lib/db/schema";

/** Procurement vertical defaults (Globecon tenant zero) */
export const DEFAULT_PROCUREMENT_LEXICON: WorkspaceLexiconSettings = {
  opportunity: "Tender",
  opportunityPlural: "Tenders",
  source: "Source",
  sourcePlural: "Sources",
  category: "Service line",
  categoryPlural: "Service lines",
  deadline: "Closing date",
  matchScore: "Match score",
  region: "Region",
  country: "Country",
  save: "Save tender",
  export: "Export",
  share: "Share",
  sync: "Sync",
  navHome: "Tenders",
  navAnalytics: "Analytics",
  navProfile: "Profile",
  navSettings: "Settings",
  navTeam: "Team",
  emptyOpportunities: "No tenders match your filters.",
  emptyOpportunitiesHint: "Try adjusting filters or run a sync to fetch new opportunities.",
  productTagline: "Tender Watch",
};
