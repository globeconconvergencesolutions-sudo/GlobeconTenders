import {
  buildDeactivatedEmail,
  buildRemovedEmail,
  buildWelcomeEmail,
} from "@/lib/email/account-templates";
import { getTransactionalEmailConfig } from "@/lib/email/config";
import { sendTransactionalEmail } from "@/lib/email/transport";
import type { UserRole } from "@/lib/db/schema";

export type EmailDeliveryResult = {
  sent: boolean;
  error?: string;
};

async function deliver(
  to: string,
  message: { subject: string; html: string; text: string },
): Promise<EmailDeliveryResult> {
  const config = getTransactionalEmailConfig();
  if (!config) {
    return { sent: false, error: "Gmail is not configured" };
  }

  try {
    await sendTransactionalEmail({ to, ...message });
    return { sent: true };
  } catch (error) {
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Email delivery failed",
    };
  }
}

export async function sendWelcomeTeamEmail(input: {
  to: string;
  name: string;
  temporaryPassword: string;
  role: UserRole;
  invitedBy: string;
}): Promise<EmailDeliveryResult> {
  const config = getTransactionalEmailConfig();
  if (!config) return { sent: false, error: "Gmail is not configured" };

  const loginUrl = `${config.appUrl}/login`;
  const message = buildWelcomeEmail({
    recipientName: input.name,
    email: input.to,
    temporaryPassword: input.temporaryPassword,
    role: input.role,
    invitedBy: input.invitedBy,
    loginUrl,
  });

  return deliver(input.to, message);
}

export async function sendDeactivatedTeamEmail(input: {
  to: string;
  name: string;
  actorName: string;
}): Promise<EmailDeliveryResult> {
  const config = getTransactionalEmailConfig();
  const message = buildDeactivatedEmail({
    recipientName: input.name,
    actorName: input.actorName,
    supportEmail: config?.user,
  });
  return deliver(input.to, message);
}

export async function sendRemovedTeamEmail(input: {
  to: string;
  name: string;
  actorName: string;
}): Promise<EmailDeliveryResult> {
  const message = buildRemovedEmail({
    recipientName: input.name,
    actorName: input.actorName,
  });
  return deliver(input.to, message);
}
