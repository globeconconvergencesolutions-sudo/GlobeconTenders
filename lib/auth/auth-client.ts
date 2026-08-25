"use client";

import { createAuthClient } from "better-auth/react";

/**
 * Same-origin client. baseURL is omitted so Better Auth uses window.location.origin
 * in the browser (correct for Netlify preview + production hosts).
 */
export const authClient = createAuthClient();

export const { useSession, signOut } = authClient;
