import { parseClosingDate } from "@/lib/sync/date-parser";
import { worldBankNoticeUrl } from "@/lib/sync/notice-urls";
import type { SyncTenderItem } from "@/lib/sync/types";

const WORLD_BANK_PROCUREMENT_URL =
  "https://search.worldbank.org/api/v2/procnotices";

const OPEN_NOTICE_QUERIES = [
  "Invitation for Bids",
  "Request for Expression of Interest",
];

const AWARD_TYPE = /contract award/i;
const ROWS_PER_QUERY = 40;

type WorldBankNotice = {
  id?: string;
  bid_description?: string;
  project_name?: string;
  notice_type?: string;
  notice_status?: string;
  notice_text?: string;
  submission_date?: string;
  noticedate?: string;
  project_ctry_name?: string;
  url?: string;
};

function stripNoticeHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&rsquo;/gi, "'")
    .replace(/&ndash;/gi, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function publishedAt(notice: WorldBankNotice): Date {
  if (notice.submission_date) {
    const parsed = new Date(notice.submission_date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return new Date();
}

function toSyncItem(notice: WorldBankNotice): SyncTenderItem | null {
  if (!notice.id || !(notice.bid_description || notice.project_name)) {
    return null;
  }

  const published = publishedAt(notice);
  const isAward = AWARD_TYPE.test(notice.notice_type ?? "");
  const noticeUrl = worldBankNoticeUrl(String(notice.id), notice.url);

  if (isAward) {
    return {
      referenceId: String(notice.id),
      title: notice.bid_description ?? notice.project_name ?? "Untitled notice",
      description: notice.project_name,
      category: notice.notice_type ?? "Development",
      deadline: published,
      url: noticeUrl,
      projectLabel: notice.project_ctry_name
        ? `World Bank · ${notice.project_ctry_name}`
        : "World Bank Project",
      status: "AWARDED",
      hasHardDeadline: true,
    };
  }

  const fallbackDeadline = new Date(
    published.getTime() + 30 * 24 * 60 * 60 * 1000,
  );
  const parsedDeadline = parseClosingDate(
    stripNoticeHtml(notice.notice_text ?? ""),
    fallbackDeadline,
    { requireKeyword: true },
  );
  const usedFallback = parsedDeadline.getTime() === fallbackDeadline.getTime();

  return {
    referenceId: String(notice.id),
    title: notice.bid_description ?? notice.project_name ?? "Untitled notice",
    description: notice.project_name,
    category: notice.notice_type ?? "Development",
    deadline: parsedDeadline,
    url: noticeUrl,
    projectLabel: notice.project_ctry_name
      ? `World Bank · ${notice.project_ctry_name}`
      : "World Bank Project",
    status: notice.notice_status ?? "OPEN",
    hasHardDeadline: !usedFallback,
  };
}

async function fetchWorldBankQuery(qterm: string): Promise<WorldBankNotice[]> {
  const url = new URL(WORLD_BANK_PROCUREMENT_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("rows", String(ROWS_PER_QUERY));
  url.searchParams.set("qterm", qterm);
  url.searchParams.set(
    "fl",
    "id,bid_description,project_name,notice_type,notice_status,notice_text,submission_date,noticedate,project_ctry_name,url",
  );
  url.searchParams.set("srt", "submission_date desc");

  const response = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`World Bank API returned ${response.status}`);
  }

  const payload = (await response.json()) as {
    documents?: Record<string, WorldBankNotice>;
    procnotices?: WorldBankNotice[];
  };

  return (
    payload.procnotices ??
    (payload.documents ? Object.values(payload.documents) : [])
  );
}

export async function fetchWorldBankTenders(): Promise<SyncTenderItem[]> {
  const batches = await Promise.all(
    OPEN_NOTICE_QUERIES.map((qterm) => fetchWorldBankQuery(qterm)),
  );

  const seen = new Set<string>();
  const items: SyncTenderItem[] = [];

  for (const notice of batches.flat()) {
    const item = toSyncItem(notice);
    if (!item || seen.has(item.referenceId)) continue;
    if (AWARD_TYPE.test(notice.notice_type ?? "")) continue;
    seen.add(item.referenceId);
    items.push(item);
  }

  return items;
}
