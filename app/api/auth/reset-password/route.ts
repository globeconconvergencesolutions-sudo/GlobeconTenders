import { NextResponse } from "next/server";
import { z } from "zod";

import {
  resetPasswordWithToken,
  verifyPasswordResetToken,
} from "@/lib/auth/password-reset";

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token")?.trim();

  if (!token) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const row = await verifyPasswordResetToken(token);
  return NextResponse.json({ valid: Boolean(row) });
}

export async function POST(request: Request) {
  try {
    const payload = resetPasswordSchema.parse(await request.json());
    const result = await resetPasswordWithToken(payload.token, payload.password);

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Unable to reset password right now" },
      { status: 500 },
    );
  }
}
