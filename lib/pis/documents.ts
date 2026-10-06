const MAX_URLS = 2;
const MAX_BYTES = 1_500_000;

async function pdfToText(bytes: Uint8Array): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return result.text ?? "";
  } finally {
    const closable = parser as { destroy?: () => Promise<void> };
    if (typeof closable.destroy === "function") {
      await closable.destroy().catch(() => undefined);
    }
  }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function readUrl(url: string): Promise<string | null> {
  if (!/^https?:\/\//i.test(url)) return null;
  const response = await fetch(url, {
    signal: AbortSignal.timeout(8000),
    redirect: "follow",
    headers: { Accept: "application/pdf,text/plain,text/html;q=0.5" },
  });
  if (!response.ok) return null;
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_BYTES) return null;
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) return null;
  const type = response.headers.get("content-type") ?? "";
  const looksPdf =
    type.includes("pdf") || url.toLowerCase().includes(".pdf") || buffer[0] === 0x25;
  if (looksPdf) {
    const text = await pdfToText(buffer);
    return text.trim().slice(0, 20000) || null;
  }
  const raw = new TextDecoder().decode(buffer);
  const text = type.includes("html") ? htmlToText(raw) : raw;
  return text.trim().slice(0, 20000) || null;
}

/** Read notice files already stored on the tender. Unreadable files return no text. */
export async function readStoredNotice(urls: string[]): Promise<{
  text: string | null;
  ref: string | null;
}> {
  for (const url of urls.filter(Boolean).slice(0, MAX_URLS)) {
    try {
      const text = await readUrl(url);
      if (text && text.length > 40) return { text, ref: url };
    } catch {
      continue;
    }
  }
  return { text: null, ref: null };
}

/** Company evidence text used only as comparison material, never as a new tender. */
export async function readEvidenceSnippets(urls: string[]): Promise<string> {
  const parts: string[] = [];
  for (const url of urls.filter(Boolean).slice(0, MAX_URLS)) {
    try {
      const text = await readUrl(url);
      if (text) parts.push(text.slice(0, 4000));
    } catch {
      continue;
    }
  }
  return parts.join("\n");
}
