import { NextResponse } from "next/server";

import { signOut } from "@/auth";

export async function POST() {
  await signOut({ redirect: false });

  const response = NextResponse.json({ ok: true });
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  return response;
}
