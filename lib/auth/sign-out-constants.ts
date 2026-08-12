export const SIGN_OUT_STORAGE_KEY = "globetender-signing-out";

/** Prevents ForceSessionClear from looping if cookies still fail to clear. */
export const FORCE_LOGOUT_ATTEMPT_KEY = "globetender-force-logout-attempt";

export const LOGIN_PATH = "/login";

export function buildLoginUrl(signedOut = true): string {
  return signedOut ? `${LOGIN_PATH}?signedOut=1` : LOGIN_PATH;
}
