import { NextResponse } from "next/server";

import { getSettingsAccessForUser } from "@/lib/auth/settings-access";
import { requireSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireSessionUser();
    const access = await getSettingsAccessForUser({
      userId: user.id,
      role: user.role,
    });

    return NextResponse.json(access);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
