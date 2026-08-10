export const SIGN_OUT_STORAGE_KEY = "globetender-signing-out";

export const LOGIN_PATH = "/login";

export function buildLoginUrl(signedOut = true): string {
  return signedOut ? `${LOGIN_PATH}?signedOut=1` : LOGIN_PATH;
}
