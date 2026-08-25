import { parseClosingDate } from "@/lib/sync/date-parser";
import type { SyncTenderItem } from "@/lib/sync/types";

export type DocumentParseContext = {
  sourceId: number;
  sourceName: string;
  documentUrl: string;
  publicId?: string | null;
};

type DocumentFormat = "csv" | "txt" | "pdf" | "unknown";

const TITLE_KEYS = ["title", "tender", "tender_title", "name", "subject"];
const DESC_KEYS = ["description", "desc", "details", "summary", "scope"];
const DEADLINE_KEYS = [
  "deadline",
  "closing_date",
  "closing date",
  "due_date",
  "due date",
  "submission_date",
];
const CATEGORY_KEYS = ["category", "type", "sector", "notice_type"];
const URL_KEYS = ["url", "link", "notice_url"];
const REF_KEYS = ["reference_id", "reference", "ref", "tender_no", "tender_number"];

function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/\s+/g, " ");
}

function pickField(row: Record<string, string>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[normalizeKey(key)];
    if (value?.trim()) return value.trim();
  }
  return undefined;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current.trim());
  return result;
}

function slugifyPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function inferCategory(text: string): string {
  const haystack = text.toLowerCase();
  if (/ict|software|digital|system|erp/.test(haystack)) return "ICT";
  if (/construction|building|works|infrastructure/.test(haystack))
    return "Construction";
  if (/consult|advisory|training|capacity/.test(haystack)) return "Services";
  if (/supply|delivery|procurement|goods/.test(haystack)) return "Supply";
  return "Document";
}

function buildTenderItem(
  partial: {
    title: string;
    description?: string;
    category?: string;
    deadline?: Date;
    url?: string;
    referenceId?: string;
  },
  ctx: DocumentParseContext,
  index: number,
): SyncTenderItem | null {
  const title = partial.title.trim();
  if (title.length < 4) return null;

  const fallbackDeadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const deadline = partial.deadline ?? fallbackDeadline;
  const refSlug = slugifyPart(partial.referenceId ?? title) || `row-${index}`;

  return {
    referenceId: `doc-${ctx.sourceId}-${refSlug}`,
    title: title.slice(0, 500),
    description: partial.description?.slice(0, 2000),
    category: partial.category ?? inferCategory(`${title} ${partial.description ?? ""}`),
    deadline,
    url: partial.url ?? ctx.documentUrl,
    projectLabel: `${ctx.sourceName} · Document`,
  };
}

export function parseCsvTenders(
  text: string,
  ctx: DocumentParseContext,
): SyncTenderItem[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(normalizeKey);
  const items: SyncTenderItem[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const values = splitCsvLine(lines[i]);
    if (values.every((v) => !v.trim())) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx]?.trim() ?? "";
    });

    const title = pickField(row, TITLE_KEYS);
    if (!title) continue;

    const deadlineText = pickField(row, DEADLINE_KEYS);
    const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const deadline = deadlineText
      ? parseClosingDate(deadlineText, fallback)
      : parseClosingDate(`${title} ${pickField(row, DESC_KEYS) ?? ""}`, fallback);

    const item = buildTenderItem(
      {
        title,
        description: pickField(row, DESC_KEYS),
        category: pickField(row, CATEGORY_KEYS),
        deadline,
        url: pickField(row, URL_KEYS),
        referenceId: pickField(row, REF_KEYS),
      },
      ctx,
      i,
    );
    if (item) items.push(item);
  }

  return items;
}

export function parseTextTenders(
  text: string,
  ctx: DocumentParseContext,
): SyncTenderItem[] {
  const normalized = text.replace(/\r/g, "").trim();
  if (!normalized) return [];

  const blocks = normalized
    .split(/(?=(?:TENDER|INVITATION TO TENDER|PROCUREMENT NOTICE|REQUEST FOR PROPOSAL))/i)
    .map((block) => block.trim())
    .filter((block) => block.length > 20);

  const sections = blocks.length > 0 ? blocks : [normalized];
  const items: SyncTenderItem[] = [];

  sections.forEach((block, index) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const title =
      lines.find((line) => line.length > 10)?.slice(0, 500) ??
      ctx.sourceName;
    const description = block.slice(0, 2000);
    const fallback = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const deadline = parseClosingDate(block, fallback);

    const item = buildTenderItem(
      {
        title,
        description,
        deadline,
        referenceId: `${ctx.publicId ?? ctx.sourceId}-${index}`,
      },
      ctx,
      index,
    );
    if (item) items.push(item);
  });

  return items;
}

export function detectDocumentFormat(
  fileName: string,
  mimeType?: string | null,
): DocumentFormat {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".csv") || mimeType?.includes("csv")) return "csv";
  if (lower.endsWith(".pdf") || mimeType === "application/pdf") return "pdf";
  if (
    lower.endsWith(".txt") ||
    mimeType?.startsWith("text/") ||
    mimeType?.includes("plain")
  ) {
    return "txt";
  }
  return "unknown";
}

export async function extractDocumentText(
  buffer: Buffer,
  format: DocumentFormat,
): Promise<string> {
  if (format === "pdf") {
    // pdfjs optional canvas deps are unavailable on Netlify; text extract still works.
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      const msg = String(args[0] ?? "");
      if (
        msg.includes("@napi-rs/canvas") ||
        msg.includes("Cannot polyfill") ||
        msg.includes("DOMMatrix") ||
        msg.includes("ImageData") ||
        msg.includes("Path2D")
      ) {
        return;
      }
      originalWarn.apply(console, args as Parameters<typeof console.warn>);
    };
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        const result = await parser.getText();
        return result.text ?? "";
      } finally {
        await parser.destroy();
      }
    } finally {
      console.warn = originalWarn;
    }
  }
  return buffer.toString("utf8");
}

export async function parseDocumentBuffer(
  buffer: Buffer,
  fileName: string,
  ctx: DocumentParseContext,
  mimeType?: string | null,
): Promise<SyncTenderItem[]> {
  const format = detectDocumentFormat(fileName, mimeType);
  if (format === "unknown") {
    throw new Error(
      "Unsupported document format. Upload CSV, TXT, or PDF files.",
    );
  }

  const text = await extractDocumentText(buffer, format);
  if (!text.trim()) {
    throw new Error("No readable text found in the uploaded document.");
  }

  if (format === "csv") {
    const csvItems = parseCsvTenders(text, ctx);
    if (csvItems.length > 0) return csvItems;
  }

  const textItems = parseTextTenders(text, ctx);
  if (textItems.length === 0) {
    throw new Error("Could not extract any tender records from the document.");
  }
  return textItems;
}
