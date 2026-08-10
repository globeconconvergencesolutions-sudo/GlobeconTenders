import type { WorkspaceOnboardingState } from "@/lib/db/schema";

export const ONBOARDING_STEPS = [
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

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]["id"];

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
};

export function computeOnboardingProgress(
  state: WorkspaceOnboardingState,
  signals: OnboardingSignals,
): OnboardingProgress {
  const manual = new Set(state.manuallyCompleted ?? []);

  const completion: Record<OnboardingStepId, boolean> = {
    source_added: signals.trackingSources > 0 || manual.has("source_added"),
    sync_run: Boolean(signals.lastSynced) || manual.has("sync_run"),
    team_invited: signals.teamMemberCount > 1 || manual.has("team_invited"),
    branding_set: signals.hasCustomBranding || manual.has("branding_set"),
  };

  const steps = ONBOARDING_STEPS.map((step) => ({
    ...step,
    completed: completion[step.id],
  }));

  const completedCount = steps.filter((s) => s.completed).length;

  return {
    steps,
    completedCount,
    totalCount: steps.length,
    dismissed: Boolean(state.dismissed),
    allComplete: completedCount === steps.length,
  };
}
