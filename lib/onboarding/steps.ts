import type { WorkspaceOnboardingState } from "@/lib/db/schema";

const PROCUREMENT_STEPS = [
  {
    id: "markets_chosen",
    title: "Choose your markets",
    description: "Pick the kinds of work you want to see. The tender list follows that choice.",
    href: "/setup",
    action: "navigate",
  },
  {
    id: "company_described",
    title: "Describe the company",
    description: "Write your legal name and a few sentences about the work you do. An invitation is later compared with what you write here.",
    href: "/company",
    action: "navigate",
  },
  {
    id: "evidence_added",
    title: "Add one piece of proof",
    description: "Upload a certificate, or paste a link to one. If it is not here yet, a comparison says the proof is missing. That does not mean you cannot do the work.",
    href: "/evidence",
    action: "navigate",
  },
  {
    id: "check_run",
    title: "Compare one invitation with your company",
    description: "Open an invitation from Tenders and choose Compare with your company. You will see how your profile lines up with what the buyer asked for.",
    href: "/",
    action: "navigate",
  },
] as const;

const WORKSPACE_STEPS = [
  {
    id: "source_added",
    title: "Add your first source",
    description: "Install a catalog portal or connect an RSS feed.",
    href: "/",
    action: "open_sources",
  },
  {
    id: "sync_run",
    title: "Run your first sync",
    description: "Pull live opportunities into your workspace.",
    href: "/",
    action: "sync",
  },
  {
    id: "team_invited",
    title: "Invite a teammate",
    description: "Add analysts or admins to collaborate.",
    href: "/admin/users",
    action: "navigate",
  },
  {
    id: "branding_set",
    title: "Customize branding",
    description: "Set your logo, colors, and display name.",
    href: "/settings/branding",
    action: "navigate",
  },
] as const;

export const ONBOARDING_STEPS = PROCUREMENT_STEPS;

export type OnboardingStepId =
  | (typeof PROCUREMENT_STEPS)[number]["id"]
  | (typeof WORKSPACE_STEPS)[number]["id"];

export type { WorkspaceOnboardingState };

export type OnboardingProgress = {
  steps: Array<{
    id: OnboardingStepId;
    title: string;
    description: string;
    href: string;
    action: string;
    completed: boolean;
  }>;
  completedCount: number;
  totalCount: number;
  dismissed: boolean;
  allComplete: boolean;
};

export type OnboardingSignals = {
  trackingSources: number;
  lastSynced: string | null;
  teamMemberCount: number;
  hasCustomBranding: boolean;
  watchlistLines: number;
  hasCompanyProfile: boolean;
  evidenceCount: number;
  assessmentCount: number;
};

export function computeOnboardingProgress(
  state: WorkspaceOnboardingState,
  signals: OnboardingSignals,
  mode: "procurement" | "workspace" = "procurement",
): OnboardingProgress {
  const manual = new Set(state.manuallyCompleted ?? []);
  const catalog = mode === "procurement" ? PROCUREMENT_STEPS : WORKSPACE_STEPS;

  const completion: Record<OnboardingStepId, boolean> = {
    markets_chosen: signals.watchlistLines > 0 || manual.has("markets_chosen"),
    company_described: signals.hasCompanyProfile || manual.has("company_described"),
    evidence_added: signals.evidenceCount > 0 || manual.has("evidence_added"),
    check_run: signals.assessmentCount > 0 || manual.has("check_run"),
    source_added: signals.trackingSources > 0 || manual.has("source_added"),
    sync_run: Boolean(signals.lastSynced) || manual.has("sync_run"),
    team_invited: signals.teamMemberCount > 1 || manual.has("team_invited"),
    branding_set: signals.hasCustomBranding || manual.has("branding_set"),
  };

  const steps = catalog.map((step) => ({
    ...step,
    completed: completion[step.id],
  }));

  const completedCount = steps.filter((step) => step.completed).length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    dismissed: Boolean(state.dismissed),
    allComplete: completedCount === steps.length,
  };
}
