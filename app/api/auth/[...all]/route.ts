import { toNextJsHandler } from "better-auth/next-js";

import { getBetterAuth } from "@/lib/auth/better-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Pass an explicit `{ handler }` object so Better Auth never tries to invoke
 * the auth export as a bare function (Proxy / bundling edge cases on Netlify).
 */
const handler = async (request: Request) => getBetterAuth().handler(request);

export const { GET, POST, PUT, PATCH, DELETE } = toNextJsHandler({ handler });
