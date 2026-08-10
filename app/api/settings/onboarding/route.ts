import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { requireSettingsManage } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";
import {
  computeOnboardingProgress,
  type OnboardingStepId,
} from "@/lib/onboarding/steps";
import {
  dismissOnboarding,
  getOnboardingContext,
} from "@/lib/onboarding/workspace";

const patchSchema = z.object({
  dismiss: z.boolean().optional(),
  completeStep: z
    .enum(["source_added", "sync_run", "team_invited", "branding_set"])
    .optional(),
});

export async function GET() {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);
    const context = await getOnboardingContext(user.orgId);
    const progress = computeOnboardingProgress(context.state, context.signals);
    return NextResponse.json({ progress });
  } catch (error) {
    return handleApiError(error, "Failed to load onboarding");
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireSessionUser();
    await requireSettingsManage(user.id, user.role);
    const payload = patchSchema.parse(await request.json());

    if (payload.dismiss) {
      await dismissOnboarding(user.orgId);
    }

    if (payload.completeStep) {
      const { markOnboardingStep } = await import("@/lib/onboarding/workspace");
      await markOnboardingStep(user.orgId, payload.completeStep as OnboardingStepId);
    }

    const context = await getOnboardingContext(user.orgId);
    const progress = computeOnboardingProgress(context.state, context.signals);
    return NextResponse.json({ progress });
  } catch (error) {
    return handleApiError(error, "Failed to update onboarding");
  }
}
