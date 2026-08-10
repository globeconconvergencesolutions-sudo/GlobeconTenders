import type { WorkspaceLexiconSettings } from "@/lib/db/schema";
import { DEFAULT_PROCUREMENT_LEXICON } from "@/lib/lexicon";

import { formatDeadline } from "@/lib/utils";

import type { EmailOrgPresentation } from "./presentation";

export type AlertTenderRow = {
  id: number;
  title: string;
  referenceId: string;
  sourceName: string;
  sourceColor: string;
  category: string;
  deadline: Date;
  matchScore: number;
  url: string | null;
  regionLabel: string | null;
  countryLabel: string | null;
};

const DEFAULT_PRESENTATION: EmailOrgPresentation = {
  displayName: "Globecon",
  productTagline: DEFAULT_PROCUREMENT_LEXICON.productTagline,
  primaryColor: "#2563eb",
  accentColor: "#1d4ed8",
  logoUrl: null,
  fallbackLogoUrl: "/brand/logo-sidebar.png",
  lexicon: DEFAULT_PROCUREMENT_LEXICON,
  emailHeaderLabel: "Globecon Tender Watch",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function tenderLocation(row: AlertTenderRow): string {
  return [row.countryLabel, row.regionLabel].filter(Boolean).join(", ") || "—";
}

function tenderRowsHtml(rows: AlertTenderRow[], appUrl: string): string {
  if (rows.length === 0) return "";

  return rows
    .map((row) => {
      const link = row.url ?? `${appUrl}/?q=${encodeURIComponent(row.referenceId)}`;
      return `
        <tr>
          <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;">
            <span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;color:#fff;background:${escapeHtml(row.sourceColor)};">
              ${escapeHtml(row.sourceName)}
            </span>
            <div style="margin-top:8px;font-size:14px;font-weight:600;color:#0f172a;line-height:1.4;">
              ${escapeHtml(row.title)}
            </div>
            <div style="margin-top:4px;font-size:12px;color:#64748b;">
              ${escapeHtml(row.referenceId)} · ${escapeHtml(row.category)}
            </div>
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569;white-space:nowrap;">
            ${escapeHtml(formatDeadline(row.deadline))}
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569;white-space:nowrap;">
            ${row.matchScore}
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569;">
            ${escapeHtml(tenderLocation(row))}
          </td>
          <td style="padding:14px 12px;border-bottom:1px solid #e2e8f0;white-space:nowrap;">
            <a href="${escapeHtml(link)}" style="font-size:12px;font-weight:600;color:#2563eb;text-decoration:none;">
              View →
            </a>
          </td>
        </tr>`;
    })
    .join("");
}

function tenderRowsText(
  rows: AlertTenderRow[],
  appUrl: string,
  deadlineLabel: string,
): string {
  return rows
    .map((row, index) => {
      const link = row.url ?? `${appUrl}/?q=${encodeURIComponent(row.referenceId)}`;
      return [
        `${index + 1}. ${row.title}`,
        `   ${row.sourceName} · ${row.referenceId} · score ${row.matchScore}`,
        `   ${deadlineLabel}: ${formatDeadline(row.deadline)} · ${tenderLocation(row)}`,
        `   ${link}`,
      ].join("\n");
    })
    .join("\n\n");
}

function sectionHtml(
  title: string,
  subtitle: string,
  rows: AlertTenderRow[],
  appUrl: string,
  lexicon: WorkspaceLexiconSettings,
) {
  if (rows.length === 0) return "";

  return `
    <div style="margin-top:28px;">
      <h2 style="margin:0 0 4px;font-size:18px;color:#0f172a;">${escapeHtml(title)}</h2>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;">${escapeHtml(subtitle)}</p>
      <table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
        <thead>
          <tr style="background:#f8fafc;">
            <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">${escapeHtml(lexicon.opportunity)}</th>
            <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">${escapeHtml(lexicon.deadline)}</th>
            <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">${escapeHtml(lexicon.matchScore)}</th>
            <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">Location</th>
            <th align="left" style="padding:10px 12px;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#64748b;">Link</th>
          </tr>
        </thead>
        <tbody>
          ${tenderRowsHtml(rows, appUrl)}
        </tbody>
      </table>
    </div>`;
}

export type DigestEmailInput = {
  recipientName: string;
  closingSoon: AlertTenderRow[];
  highMatch: AlertTenderRow[];
  closingSoonDays: number;
  highMatchThreshold: number;
  appUrl: string;
  org?: EmailOrgPresentation;
};

export function buildDigestEmail(input: DigestEmailInput): {
  subject: string;
  html: string;
  text: string;
} {
  const org = input.org ?? DEFAULT_PRESENTATION;
  const { lexicon } = org;
  const opp = lexicon.opportunityPlural.toLowerCase();
  const total = input.closingSoon.length + input.highMatch.length;
  const dateLabel = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject =
    total === 1
      ? `${org.emailHeaderLabel} — 1 ${lexicon.opportunity.toLowerCase()} needs your attention`
      : `${org.emailHeaderLabel} — ${total} ${opp} need your attention`;

  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f1f5f9;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:720px;margin:0 auto;padding:32px 16px;">
      <div style="background:linear-gradient(135deg,${escapeHtml(org.accentColor)},${escapeHtml(org.primaryColor)});border-radius:16px 16px 0 0;padding:28px 28px 24px;color:#fff;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">
          ${escapeHtml(org.emailHeaderLabel)}
        </div>
        <h1 style="margin:10px 0 8px;font-size:26px;line-height:1.2;">Your ${escapeHtml(opp)} digest</h1>
        <p style="margin:0;font-size:14px;opacity:0.92;">${escapeHtml(dateLabel)} · prepared for ${escapeHtml(input.recipientName)}</p>
      </div>
      <div style="background:#fff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:28px;">
        <p style="margin:0;font-size:15px;color:#334155;line-height:1.6;">
          We found <strong>${total}</strong> ${escapeHtml(opp)} matching your saved filters and alert preferences.
        </p>
        <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap;">
          <div style="flex:1;min-width:140px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:12px;padding:14px 16px;">
            <div style="font-size:24px;font-weight:700;color:#1d4ed8;">${input.closingSoon.length}</div>
            <div style="font-size:12px;color:#475569;margin-top:4px;">Closing within ${input.closingSoonDays} days</div>
          </div>
          <div style="flex:1;min-width:140px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:12px;padding:14px 16px;">
            <div style="font-size:24px;font-weight:700;color:#059669;">${input.highMatch.length}</div>
            <div style="font-size:12px;color:#475569;margin-top:4px;">High ${escapeHtml(lexicon.matchScore.toLowerCase())} (≥ ${input.highMatchThreshold})</div>
          </div>
        </div>
        ${sectionHtml(
          "Closing soon",
          `Open ${opp} in your filter set closing within the next ${input.closingSoonDays} days.`,
          input.closingSoon,
          input.appUrl,
          lexicon,
        )}
        ${sectionHtml(
          "High match opportunities",
          `${lexicon.opportunityPlural} scoring ${input.highMatchThreshold} or above against ${org.displayName} ${lexicon.categoryPlural.toLowerCase()}.`,
          input.highMatch,
          input.appUrl,
          lexicon,
        )}
        <div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;">
          <a href="${escapeHtml(input.appUrl)}" style="display:inline-block;background:${escapeHtml(org.primaryColor)};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 18px;border-radius:10px;">
            Open dashboard
          </a>
          <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;line-height:1.5;">
            Manage alert preferences anytime from your
            <a href="${escapeHtml(`${input.appUrl}/profile`)}" style="color:${escapeHtml(org.primaryColor)};">profile settings</a>.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    `${org.emailHeaderLabel} — ${dateLabel}`,
    `Hi ${input.recipientName},`,
    "",
    `${total} ${opp} matching your filters:`,
    `- ${input.closingSoon.length} closing within ${input.closingSoonDays} days`,
    `- ${input.highMatch.length} high match (score ≥ ${input.highMatchThreshold})`,
    "",
    input.closingSoon.length
      ? `CLOSING SOON\n${tenderRowsText(input.closingSoon, input.appUrl, lexicon.deadline)}`
      : "",
    input.highMatch.length
      ? `HIGH MATCH\n${tenderRowsText(input.highMatch, input.appUrl, lexicon.deadline)}`
      : "",
    "",
    `Dashboard: ${input.appUrl}`,
    `Preferences: ${input.appUrl}/profile`,
  ]
    .filter(Boolean)
    .join("\n");

  return { subject, html, text };
}

export function buildTestEmail(
  recipientName: string,
  appUrl: string,
  org: EmailOrgPresentation = DEFAULT_PRESENTATION,
) {
  const subject = `${org.emailHeaderLabel} — test email connected`;
  const html = `
<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${escapeHtml(org.primaryColor)};">
        ${escapeHtml(org.emailHeaderLabel)}
      </div>
      <h1 style="margin:12px 0 8px;font-size:22px;color:#0f172a;">Gmail alerts are working</h1>
      <p style="margin:0 0 16px;font-size:14px;color:#475569;line-height:1.6;">
        Hi ${escapeHtml(recipientName)}, this confirms your ${escapeHtml(org.emailHeaderLabel)} account can receive closing-soon and high-match alerts via Gmail.
      </p>
      <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:${escapeHtml(org.primaryColor)};color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 18px;border-radius:10px;">
        Go to dashboard
      </a>
    </div>
  </body>
</html>`;

  const text = [
    `${org.emailHeaderLabel} — test email`,
    `Hi ${recipientName},`,
    "Gmail alerts are configured and working.",
    `Dashboard: ${appUrl}`,
  ].join("\n");

  return { subject, html, text };
}
