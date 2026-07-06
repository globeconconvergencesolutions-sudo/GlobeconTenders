import { loadEnv } from "@/lib/env";

export type EmailConfig = {
  user: string;
  appPassword: string;
  fromName: string;
  appUrl: string;
  enabled: boolean;
};

function getSmtpCredentials(): EmailConfig | null {
  loadEnv();

  const user = process.env.GMAIL_USER?.trim();
  const appPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

  if (!user || !appPassword) {
    return null;
  }

  return {
    user,
    appPassword,
    fromName: process.env.GMAIL_FROM_NAME?.trim() || "Globecon Tender Watch",
    appUrl: process.env.APP_URL?.trim() || "http://localhost:3000",
    enabled: true,
  };
}

/** Alert digests and profile test email — respects EMAIL_ALERTS_ENABLED. */
export function getEmailConfig(): EmailConfig | null {
  const credentials = getSmtpCredentials();
  if (!credentials) return null;

  const alertsEnabled = process.env.EMAIL_ALERTS_ENABLED !== "false";
  if (!alertsEnabled) return null;

  return credentials;
}

/** Welcome, deactivation, removal, and password-reset mail — always when SMTP is set. */
export function getTransactionalEmailConfig(): EmailConfig | null {
  return getSmtpCredentials();
}

export function isEmailConfigured(): boolean {
  return getEmailConfig() !== null;
}

export function isTransactionalEmailConfigured(): boolean {
  return getTransactionalEmailConfig() !== null;
}
