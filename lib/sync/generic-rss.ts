import { parseClosingDate } from "@/lib/sync/date-parser";
import { parseRssFeed } from "@/lib/sync/rss-parser";
import type { SyncTenderItem } from "@/lib/sync/types";

const FETCH_HEADERS = {
  Accept: "application/rss+xml, application/xml, text/xml, */*",
  "User-Agent": "GlobeconTenderWatch/2.0 (+https://globecon.com)",
};

function inferCategory(title: string, description?: string): string {
  const haystack = `${title} ${description ?? ""}`.toLowerCase();
  if (/ict|software|digital|devices|computer/.test(haystack)) return "ICT";
  if (/construction|works|building|road|infrastructure/.test(haystack))
    return "Construction";
  if (/consult|advisory|services|training/.test(haystack)) return "Services";
  if (/supply|delivery|goods|procurement/.test(haystack)) return "Supply";
  return "Procurement";
}

function referenceFromLink(link: string, title: string): string {
  try {
    const url = new URL(link);
    const slug = url.pathname.split("/").filter(Boolean).pop();
    if (slug) return slug.slice(0, 120);
  } catch {
    // fall through
  }
  return title.slice(0, 80).replace(/\s+/g, "-").toLowerCase();
}

export async function fetchGenericRssTenders(
  feedUrl: string,
  projectLabel = "RSS Feed",
): Promise<SyncTenderItem[]> {
  const response = await fetch(feedUrl, {
    headers: FETCH_HEADERS,
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`RSS feed returned ${response.status}`);
  }

  const xml = await response.text();
  const items = parseRssFeed(xml).slice(0, 60);

  return items.map((item) => {
    const publishedAt = item.pubDate ? new Date(item.pubDate) : new Date();
    const fallbackDeadline = new Date(
      publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
    );
    const deadline = parseClosingDate(
      `${item.title} ${item.description ?? ""}`,
      fallbackDeadline,
    );

    return {
      referenceId: `rss-${referenceFromLink(item.link, item.title)}`.slice(0, 120),
      title: item.title,
      description: item.description,
      category: inferCategory(item.title, item.description),
      deadline,
      url: item.link,
      projectLabel,
    };
  });
}
