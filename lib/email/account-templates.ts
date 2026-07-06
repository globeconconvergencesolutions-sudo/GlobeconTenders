import { ROLE_LABELS } from "@/lib/auth/permissions";
import type { UserRole } from "@/lib/db/schema";
import {
  emailShell,
  escapeHtml,
  infoBox,
  primaryButton,
} from "@/lib/email/html";

export function buildWelcomeEmail(input: {
  recipientName: string;
  email: string;
  temporaryPassword: string;
  role: UserRole;
  invitedBy: string;
  loginUrl: string;
}) {
  const subject = "Welcome to Globecon Tender Watch — your account is ready";
  const roleLabel = ROLE_LABELS[input.role];

  const html = emailShell(
    "You're invited to Tender Watch",
    `
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${escapeHtml(input.recipientName)}, ${escapeHtml(input.invitedBy)} created a Globecon Tender Watch account for you as <strong>${escapeHtml(roleLabel)}</strong>.
      </p>
      ${infoBox(`
        <div style="margin-bottom:8px;"><strong>Email:</strong> ${escapeHtml(input.email)}</div>
        <div><strong>Temporary password:</strong> <code style="font-size:13px;background:#e2e8f0;padding:2px 6px;border-radius:4px;">${escapeHtml(input.temporaryPassword)}</code></div>
      `)}
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.6;">
        Sign in using the button below, then change your password from your profile after first login.
      </p>
      ${primaryButton(input.loginUrl, "Sign in to Tender Watch")}
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
        If the button does not work, copy this link:<br/>
        <span style="word-break:break-all;">${escapeHtml(input.loginUrl)}</span>
      </p>
    `,
  );

  const text = [
    "Welcome to Globecon Tender Watch",
    `Hi ${input.recipientName},`,
    "",
    `${input.invitedBy} created your account as ${roleLabel}.`,
    "",
    `Email: ${input.email}`,
    `Temporary password: ${input.temporaryPassword}`,
    "",
    `Sign in: ${input.loginUrl}`,
    "",
    "Please change your password after first login.",
  ].join("\n");

  return { subject, html, text };
}

export function buildDeactivatedEmail(input: {
  recipientName: string;
  actorName: string;
  supportEmail?: string;
}) {
  const subject = "Your Globecon Tender Watch access has been deactivated";

  const html = emailShell(
    "Account deactivated",
    `
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${escapeHtml(input.recipientName)}, your Globecon Tender Watch account was deactivated by ${escapeHtml(input.actorName)}.
      </p>
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
        You will no longer be able to sign in until an administrator reactivates your account.
      </p>
      ${
        input.supportEmail
          ? `<p style="margin:16px 0 0;font-size:13px;color:#64748b;">Questions? Contact ${escapeHtml(input.supportEmail)}.</p>`
          : ""
      }
    `,
  );

  const text = [
    subject,
    `Hi ${input.recipientName},`,
    "",
    `Your account was deactivated by ${input.actorName}.`,
    "You cannot sign in until an administrator reactivates your account.",
  ].join("\n");

  return { subject, html, text };
}

export function buildRemovedEmail(input: {
  recipientName: string;
  actorName: string;
}) {
  const subject = "Your Globecon Tender Watch account has been removed";

  const html = emailShell(
    "Account removed",
    `
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${escapeHtml(input.recipientName)}, your Globecon Tender Watch account was permanently removed by ${escapeHtml(input.actorName)}.
      </p>
      <p style="margin:0;font-size:14px;color:#475569;line-height:1.6;">
        If you believe this was a mistake, contact your Globecon administrator.
      </p>
    `,
  );

  const text = [
    subject,
    `Hi ${input.recipientName},`,
    "",
    `Your account was removed by ${input.actorName}.`,
    "Contact your administrator if this was unexpected.",
  ].join("\n");

  return { subject, html, text };
}

export function buildPasswordResetEmail(input: {
  recipientName: string;
  resetUrl: string;
  expiresMinutes: number;
}) {
  const subject = "Reset your Globecon Tender Watch password";

  const html = emailShell(
    "Reset your password",
    `
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${escapeHtml(input.recipientName)}, we received a request to reset your password. This link expires in ${input.expiresMinutes} minutes.
      </p>
      ${primaryButton(input.resetUrl, "Choose a new password")}
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
        If you did not request this, you can ignore this email. Your password will not change.
      </p>
      <p style="margin:8px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">
        ${escapeHtml(input.resetUrl)}
      </p>
    `,
  );

  const text = [
    subject,
    `Hi ${input.recipientName},`,
    "",
    `Reset your password (expires in ${input.expiresMinutes} minutes):`,
    input.resetUrl,
    "",
    "If you did not request this, ignore this email.",
  ].join("\n");

  return { subject, html, text };
}
