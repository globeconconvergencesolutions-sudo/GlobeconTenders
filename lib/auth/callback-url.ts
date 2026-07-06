const DEFAULT_CALLBACK = "/";

/** Prevent open redirects — only allow same-origin relative paths. */
export function sanitizeCallbackUrl(
  callbackUrl: string | undefined | null,
): string {
  if (!callbackUrl) return DEFAULT_CALLBACK;

  try {
    if (callbackUrl.startsWith("//")) return DEFAULT_CALLBACK;
    if (callbackUrl.includes("://")) return DEFAULT_CALLBACK;
    if (!callbackUrl.startsWith("/")) return DEFAULT_CALLBACK;
    if (callbackUrl.startsWith("/login")) return DEFAULT_CALLBACK;
    return callbackUrl;
  } catch {
    return DEFAULT_CALLBACK;
  }
}
