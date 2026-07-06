import nodemailer from "nodemailer";
import type Transporter from "nodemailer/lib/mailer";

import {
  getEmailConfig,
  getTransactionalEmailConfig,
} from "@/lib/email/config";

const CONNECTION_TIMEOUT_MS = 15_000;

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const config = getTransactionalEmailConfig();
  if (!config) {
    throw new Error(
      "Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env.local",
    );
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: config.user,
      pass: config.appPassword,
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: CONNECTION_TIMEOUT_MS,
    socketTimeout: CONNECTION_TIMEOUT_MS,
  });

  return transporter;
}

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export type EmailConnectionStatus = {
  configured: boolean;
  connected: boolean;
  smtpConfigured: boolean;
  alertsEnabled: boolean;
  fromAddress?: string;
  fromName?: string;
  error?: string;
};

function normalizeSmtpError(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown email error";

  const message = error.message;
  if (/invalid login|username and password not accepted|535/i.test(message)) {
    return "Gmail rejected the app password. Regenerate an App Password under Google Account → Security → 2-Step Verification → App passwords.";
  }
  if (/timeout|timed out|ETIMEDOUT|ECONNRESET/i.test(message)) {
    return "Timed out connecting to Gmail SMTP. Check your network or firewall.";
  }
  return message;
}

export async function getEmailConnectionStatus(): Promise<EmailConnectionStatus> {
  const smtpConfig = getTransactionalEmailConfig();
  const alertsConfig = getEmailConfig();

  if (!smtpConfig) {
    return {
      configured: false,
      connected: false,
      smtpConfigured: false,
      alertsEnabled: false,
      error: "GMAIL_USER and GMAIL_APP_PASSWORD are missing",
    };
  }

  try {
    await withTimeout(
      getTransporter().verify(),
      CONNECTION_TIMEOUT_MS,
      "Gmail connection timed out after 15s",
    );
    return {
      configured: Boolean(alertsConfig),
      connected: true,
      smtpConfigured: true,
      alertsEnabled: Boolean(alertsConfig),
      fromAddress: smtpConfig.user,
      fromName: smtpConfig.fromName,
    };
  } catch (error) {
    return {
      configured: Boolean(alertsConfig),
      connected: false,
      smtpConfigured: true,
      alertsEnabled: Boolean(alertsConfig),
      fromAddress: smtpConfig.user,
      fromName: smtpConfig.fromName,
      error: normalizeSmtpError(error),
    };
  }
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const config = getEmailConfig();
  if (!config) {
    throw new Error("Email alerts are disabled or Gmail is not configured");
  }

  await deliverEmail(config, input);
}

export async function sendTransactionalEmail(
  input: SendEmailInput,
): Promise<void> {
  const config = getTransactionalEmailConfig();
  if (!config) {
    throw new Error("Gmail is not configured");
  }

  await deliverEmail(config, input);
}

async function deliverEmail(
  config: NonNullable<ReturnType<typeof getEmailConfig>>,
  input: SendEmailInput,
): Promise<void> {
  const mailer = getTransporter();
  try {
    await withTimeout(
      mailer.sendMail({
        from: `"${config.fromName}" <${config.user}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
      CONNECTION_TIMEOUT_MS,
      "Sending email timed out after 15s",
    );
  } catch (error) {
    throw new Error(normalizeSmtpError(error));
  }
}

export async function verifyEmailConnection(): Promise<boolean> {
  const status = await getEmailConnectionStatus();
  return status.connected;
}

export function maskEmailAddress(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}
