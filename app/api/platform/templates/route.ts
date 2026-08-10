import { NextResponse } from "next/server";

import { requirePlatformAdmin } from "@/lib/auth/session";
import { listTemplateSummaries } from "@/lib/templates/load";

export async function GET() {
  try {
    await requirePlatformAdmin();
    return NextResponse.json({ templates: listTemplateSummaries() });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "FORBIDDEN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
