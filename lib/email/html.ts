export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function emailShell(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f8fafc;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;">
      <div style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2563eb;">
        Globecon Tender Watch
      </div>
      <h1 style="margin:12px 0 8px;font-size:22px;color:#0f172a;">${escapeHtml(title)}</h1>
      ${bodyHtml}
    </div>
  </body>
</html>`;
}

export function primaryButton(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;margin-top:20px;background:#2563eb;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 18px;border-radius:10px;">${escapeHtml(label)}</a>`;
}

export function infoBox(content: string): string {
  return `<div style="margin:16px 0;padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;font-size:14px;color:#334155;line-height:1.6;">${content}</div>`;
}
