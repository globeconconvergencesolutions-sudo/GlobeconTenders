export type ParsedClientError = {
  message: string;
  code?: string;
  upgradeUrl?: string;
  contact?: string;
  fieldErrors?: Record<string, string[]>;
};

type ApiErrorPayload = {
  error?: unknown;
  code?: string;
  upgradeUrl?: string;
  contact?: string;
  details?: {
    fieldErrors?: Record<string, string[]>;
    formErrors?: string[];
  };
};

function firstFieldError(
  fieldErrors?: Record<string, string[]>,
): string | null {
  if (!fieldErrors) return null;
  for (const messages of Object.values(fieldErrors)) {
    if (messages[0]) return messages[0];
  }
  return null;
}

export function parseClientError(
  payload: unknown,
  fallback = "Something went wrong",
): ParsedClientError {
  const body = (payload ?? {}) as ApiErrorPayload;

  if (typeof body.error === "string") {
    return {
      message: body.error,
      code: body.code,
      upgradeUrl: body.upgradeUrl,
      contact: body.contact,
      fieldErrors: body.details?.fieldErrors,
    };
  }

  if (body.details && typeof body.details === "object") {
    const details = body.details as ApiErrorPayload["details"];
    const fieldMessage = firstFieldError(details?.fieldErrors);
    if (fieldMessage) {
      return {
        message: fieldMessage,
        code: body.code ?? "VALIDATION_ERROR",
        fieldErrors: details?.fieldErrors,
      };
    }
    if (details?.formErrors?.[0]) {
      return {
        message: details.formErrors[0],
        code: body.code ?? "VALIDATION_ERROR",
      };
    }
  }

  return { message: fallback, code: body.code };
}

export async function readApiError(
  response: Response,
  fallback = "Request failed",
): Promise<ParsedClientError> {
  try {
    const payload = await response.json();
    return parseClientError(payload, fallback);
  } catch {
    return {
      message: fallback,
      code: response.status === 401 ? "UNAUTHORIZED" : undefined,
    };
  }
}

export function isPlanLimitError(error: ParsedClientError): boolean {
  return (
    error.code === "SEAT_LIMIT" ||
    error.code === "SOURCE_LIMIT" ||
    error.code === "SYNC_BLOCKED" ||
    error.code === "ORG_SUSPENDED"
  );
}
