import { NextResponse } from "next/server";

import { loadEnv } from "@/lib/env";
import { expireTrials } from "@/lib/platform/trials";

export async function POST(request: Request) {
  loadEnv();
  const cronSecret = process.env.SYNC_CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await expireTrials();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Trial expiry failed" },
      { status: 500 },
    );
  }
}
