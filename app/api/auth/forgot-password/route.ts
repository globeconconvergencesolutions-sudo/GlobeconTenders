import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createPasswordResetToken,
  findActiveUserByEmail,
  PASSWORD_RESET_EXPIRY_MINUTES,
} from "@/lib/auth/password-reset";
import { buildPasswordResetEmail } from "@/lib/email/account-templates";
import { getTransactionalEmailConfig } from "@/lib/email/config";
import { sendTransactionalEmail } from "@/lib/email/transport";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const GENERIC_MESSAGE =
  "If an account exists for that email, we sent password reset instructions.";

export async function POST(request: Request) {
  try {
    const { email } = forgotPasswordSchema.parse(await request.json());
    const normalizedEmail = email.trim().toLowerCase();

    const user = await findActiveUserByEmail(normalizedEmail);
    if (user) {
      const config = getTransactionalEmailConfig();
      if (config) {
        const rawToken = await createPasswordResetToken(user.id);
        const resetUrl = `${config.appUrl}/login/reset-password?token=${encodeURIComponent(rawToken)}`;
        const message = buildPasswordResetEmail({
          recipientName: user.name,
          resetUrl,
          expiresMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
        });

        try {
          await sendTransactionalEmail({
            to: user.email,
            ...message,
          });
        } catch {
          // Never reveal whether the account exists or email failed.
        }
      }
    }

    return NextResponse.json({ message: GENERIC_MESSAGE });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    return NextResponse.json({ message: GENERIC_MESSAGE });
  }
}
