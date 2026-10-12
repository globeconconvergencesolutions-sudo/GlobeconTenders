import { NextResponse } from "next/server";
import { z } from "zod";

import { PlanLimitError } from "@/lib/platform/limits";

export type ApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INVALID_SLUG"
  | "SLUG_TAKEN"
  | "EMAIL_TAKEN"
  | "ORG_NOT_FOUND"
  | "ORG_SUSPENDED"
  | "PROTECTED_ORG"
  | "CONFIRM_SLUG_MISMATCH"
  | "SYNC_BLOCKED"
  | "SEAT_LIMIT"
  | "SOURCE_LIMIT"
  | "FEATURE_DISABLED"
  | "INTERNAL_ERROR";

export type ApiErrorBody = {
  error: string;
  code?: ApiErrorCode;
  details?: unknown;
  upgradeUrl?: string;
  contact?: string;
};

const PLAN_LIMIT_CODES = new Set<ApiErrorCode>([
  "ORG_SUSPENDED",
  "SYNC_BLOCKED",
  "SEAT_LIMIT",
  "SOURCE_LIMIT",
]);

export function apiErrorResponse(
  status: number,
  body: ApiErrorBody,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(body, { status });
}

function mapKnownErrorMessage(message: string): ApiErrorBody | null {
  const known: Record<string, ApiErrorBody> = {
    UNAUTHORIZED: { error: "Unauthorized", code: "UNAUTHORIZED" },
    FORBIDDEN: { error: "Forbidden", code: "FORBIDDEN" },
    FEATURE_DISABLED: {
      error: "This feature is disabled for your workspace",
      code: "FEATURE_DISABLED",
    },
    ORG_NOT_FOUND: { error: "Organization not found", code: "ORG_NOT_FOUND" },
    ORG_SUSPENDED: {
      error: "This workspace is suspended",
      code: "ORG_SUSPENDED",
    },
    PROTECTED_ORG: {
      error: "The Globecon platform organization cannot be deleted",
      code: "PROTECTED_ORG",
    },
    CONFIRM_SLUG_MISMATCH: {
      error: "Confirmation slug does not match the organization",
      code: "CONFIRM_SLUG_MISMATCH",
    },
    SLUG_TAKEN: {
      error: "That workspace URL is already taken",
      code: "SLUG_TAKEN",
    },
    EMAIL_TAKEN: {
      error: "An account with this email already exists",
      code: "EMAIL_TAKEN",
    },
    INVALID_CREDENTIALS: {
      error:
        "That email is already registered. Sign in with your existing password to create another workspace.",
      code: "UNAUTHORIZED",
    },
    INVALID_SLUG: {
      error: "Invalid or reserved workspace URL",
      code: "INVALID_SLUG",
    },
  };

  return known[message] ?? null;
}

export function handleApiError(
  error: unknown,
  fallback = "Request failed",
): NextResponse<ApiErrorBody> {
  if (error instanceof PlanLimitError) {
    const code = error.code as ApiErrorCode;
    return apiErrorResponse(403, {
      error: error.message,
      code,
      ...(PLAN_LIMIT_CODES.has(code) ? { upgradeUrl: "/settings/plan" } : {}),
    });
  }

  if (error instanceof z.ZodError) {
    return apiErrorResponse(400, {
      error: "Validation failed",
      code: "VALIDATION_ERROR",
      details: error.flatten(),
    });
  }

  if (error instanceof Error) {
    const mapped = mapKnownErrorMessage(error.message);
    if (mapped) {
      const status =
        mapped.code === "UNAUTHORIZED"
          ? 401
          : mapped.code === "FORBIDDEN" ||
              mapped.code === "ORG_SUSPENDED" ||
              mapped.code === "FEATURE_DISABLED" ||
              mapped.code === "PROTECTED_ORG"
            ? 403
            : mapped.code === "SLUG_TAKEN" || mapped.code === "EMAIL_TAKEN"
              ? 409
              : mapped.code === "ORG_NOT_FOUND"
                ? 404
                : mapped.code === "INVALID_SLUG" ||
                    mapped.code === "CONFIRM_SLUG_MISMATCH"
                  ? 400
                  : 400;
      return apiErrorResponse(status, mapped);
    }

    if (process.env.NODE_ENV === "development") {
      return apiErrorResponse(500, {
        error: error.message,
        code: "INTERNAL_ERROR",
      });
    }
  }

  return apiErrorResponse(500, {
    error: fallback,
    code: "INTERNAL_ERROR",
  });
}
