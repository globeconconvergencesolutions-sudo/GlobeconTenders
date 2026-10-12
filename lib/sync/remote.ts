const TIMEOUT_MS = 8_000;

/** Always hit the portal. A cached 403 or 429 would make every later sync the same day fail the same way. */
export async function fetchRemote(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  try {
    return await fetch(url, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError")
    ) {
      throw new Error(
        "The source did not respond in time. Wait a few minutes and sync again.",
      );
    }
    throw error;
  }
}

export function portalStatusError(portal: string, status: number): Error {
  if (status === 429) {
    return new Error(
      `${portal} asked us to slow down. Wait a few minutes before syncing again.`,
    );
  }
  if (status === 403) {
    return new Error(
      `${portal} refused the automated read. Notices already saved stay in the list.`,
    );
  }
  return new Error(`${portal} returned ${status}`);
}
