import type { SyncTenderItem } from "@/lib/sync/types";
import { parseClosingDate } from "@/lib/sync/date-parser";

function decodeHtml(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ");
}

function stripHtml(html: string): string {
  return decodeHtml(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

const TENDER_YETU_API = "https://www.tenderyetu.com/wp-json/wp/v2/posts";
const DEFAULT_PER_PAGE = 50;
const MAX_PAGES = 2;

type WpPost = {
  id: number;
  slug: string;
  link: string;
  date: string;
  title: { rendered: string };
  excerpt: { rendered: string };
};

function inferCategory(slug: string, title: string): string {
  const haystack = `${slug} ${title}`.toLowerCase();
  if (/ict|software|digital|hub|devices|computer/.test(haystack)) return "ICT";
  if (/insurance|brokerage/.test(haystack)) return "Insurance";
  if (/construction|laboratory|fencing|verandah|building|works/.test(haystack))
    return "Construction";
  if (/supply|delivery|procurement|goods/.test(haystack)) return "Supply";
  if (/consult|advisory|services|training/.test(haystack)) return "Services";
  if (/prequalification|registration|framework/.test(haystack))
    return "Prequalification";
  return "Kenya Procurement";
}

function isTenderPost(post: WpPost): boolean {
  if (post.slug.includes("tenders-gazette")) return false;
  const title = stripHtml(post.title.rendered).toLowerCase();
  return title.includes("tender") || title.includes("procurement");
}

export async function fetchTenderYetuTenders(
  perPage = DEFAULT_PER_PAGE,
): Promise<SyncTenderItem[]> {
  const items: SyncTenderItem[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const url = new URL(TENDER_YETU_API);
    url.searchParams.set("per_page", String(perPage));
    url.searchParams.set("page", String(page));
    url.searchParams.set(
      "_fields",
      "id,slug,link,date,title,excerpt",
    );

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "GlobeconTenderWatch/2.0",
      },
      next: { revalidate: 0 },
    });

    if (response.status === 400) break;
    if (!response.ok) {
      throw new Error(`Tender Yetu API returned ${response.status}`);
    }

    const posts = (await response.json()) as WpPost[];
    if (!posts.length) break;

    for (const post of posts) {
      if (!isTenderPost(post)) continue;

      const title = stripHtml(post.title.rendered);
      const description = stripHtml(post.excerpt.rendered);
      const publishedAt = new Date(post.date);
      const fallbackDeadline = new Date(
        publishedAt.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
      const deadline = parseClosingDate(
        `${description} ${title}`,
        fallbackDeadline,
      );

      items.push({
        referenceId: `ty-${post.id}`,
        title,
        description: description || undefined,
        category: inferCategory(post.slug, title),
        deadline,
        url: post.link,
        projectLabel: "Tender Yetu · Kenya",
      });
    }

    const totalPages = Number(response.headers.get("X-WP-TotalPages") ?? "1");
    if (page >= totalPages) break;
  }

  return items;
}
