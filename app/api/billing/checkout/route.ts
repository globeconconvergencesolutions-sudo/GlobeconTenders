import { apiErrorResponse, handleApiError } from "@/lib/api/errors";
import { requireSessionUser } from "@/lib/auth/session";

export async function POST() {
  try {
    await requireSessionUser();

    if (!process.env.STRIPE_SECRET_KEY) {
      return apiErrorResponse(503, {
        error: "Online checkout is not configured yet",
        code: "INTERNAL_ERROR",
        contact: "mailto:support@globeconcs.com?subject=GlobeTender%20Cloud%20upgrade",
      });
    }

    return apiErrorResponse(501, {
      error: "Stripe checkout is not enabled in this deployment",
      code: "INTERNAL_ERROR",
    });
  } catch (error) {
    return handleApiError(error, "Checkout failed");
  }
}
