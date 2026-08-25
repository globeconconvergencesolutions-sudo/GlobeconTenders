import { getSessionCookie } from "better-auth/cookies";

/**
 * Better Auth session cookies are signed as `${token}.${signature}`.
 * `ba_session.token` stores the raw token only.
 *
 * `getSessionCookie()` returns the full signed value — using it as a DB key
 * misses the row, so middleware/API treat a valid login as logged out.
 */
export function resolveSessionTokenFromCookieValue(
  cookieValue: string | null | undefined,
): string | null {
  if (!cookieValue) return null;
  const trimmed = cookieValue.trim();
  if (!trimmed) return null;

  const dot = trimmed.indexOf(".");
  if (dot <= 0) return trimmed;
  return trimmed.slice(0, dot);
}

export function resolveSessionTokenFromHeaders(
  headerStore: Headers,
): string | null {
  return resolveSessionTokenFromCookieValue(getSessionCookie(headerStore));
}
