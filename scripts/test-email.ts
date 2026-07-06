import { loadEnv } from "../lib/env";
import { getEmailConnectionStatus, maskEmailAddress, sendEmail } from "../lib/email/transport";
import { buildTestEmail } from "../lib/email/templates";
import { getEmailConfig, isEmailConfigured } from "../lib/email/config";

async function main() {
  loadEnv();

  console.log("=== Globecon email check ===\n");
  console.log("EMAIL_ALERTS_ENABLED:", process.env.EMAIL_ALERTS_ENABLED ?? "(unset)");
  console.log("Configured:", isEmailConfigured());

  const status = await getEmailConnectionStatus();
  console.log("SMTP connected:", status.connected);
  if (status.fromAddress) {
    console.log("From:", maskEmailAddress(status.fromAddress));
  }
  if (status.error) {
    console.log("Connection error:", status.error);
    process.exit(1);
  }

  const config = getEmailConfig();
  if (!config) {
    console.log("\nSet GMAIL_USER + GMAIL_APP_PASSWORD in .env.local");
    process.exit(1);
  }

  const to = process.argv[2]?.trim() || config.user;
  const message = buildTestEmail("Globecon Admin", config.appUrl);

  console.log("\nSending test email to:", maskEmailAddress(to));
  await sendEmail({
    to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  console.log("SUCCESS — test email sent via Gmail app password SMTP.");
}

main().catch((error) => {
  console.error("\nFAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
