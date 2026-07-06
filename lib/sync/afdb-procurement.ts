import type { SyncTenderItem } from "@/lib/sync/types";

const USER_AGENT = "Mozilla/5.0 (compatible; GlobeconTenderWatch/2.0)";

type AfdbListingRow = {
  title: string;
  url: string;
  publishedAt?: Date;
};

function parseAfdbListing(html: string, baseUrl: string): AfdbListingRow[] {
  const rows: AfdbListingRow[] = [];
  const pattern =
    /content="(\d{4}-\d{2}-\d{2}T[^"]+)"[\s\S]{0,1200}?href="(\/en\/documents\/[^"]+)"[^>]*>([^<]+)<\/a>/gi;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const publishedAt = new Date(match[1]);
    const path = match[2];
    const title = match[3].replace(/\s+/g, " ").trim();
    if (!title || (!path.includes("spn-") && !path.includes("ifb-") && !path.includes("gpn-"))) {
      continue;
    }

    rows.push({
      title,
      url: `${baseUrl}${path}`,
      publishedAt: Number.isNaN(publishedAt.getTime()) ? undefined : publishedAt,
    });
  }

  if (rows.length > 0) return rows;

  const fallback =
    /href="(\/en\/documents\/(?:spn|ifb|gpn)-[^"]+)"[^>]*>([^<]+)<\/a>/gi;
  while ((match = fallback.exec(html)) !== null) {
    rows.push({
      title: match[2].replace(/\s+/g, " ").trim(),
      url: `${baseUrl}${match[1]}`,
    });
  }

  return rows;
}

function inferCategory(title: string): string {
  const lower = title.toLowerCase();
  if (/consult|audit|advisory/.test(lower)) return "Consultancy";
  if (/construction|road|works|rehabilitation|drilling/.test(lower))
    return "Construction";
  if (/supply|delivery|equipment|devices/.test(lower)) return "Supply";
  if (/recruit|individual consultant|services/.test(lower)) return "Services";
  return "AfDB Procurement";
}

export async function fetchAfdbProcurementTenders(
  listingUrl: string,
): Promise<SyncTenderItem[]> {
  const response = await fetch(listingUrl, {
    headers: {
      Accept: "text/html,application/xhtml+xml",
      "User-Agent": USER_AGENT,
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`AfDB listing returned ${response.status}`);
  }

  const html = await response.text();
  const baseUrl = new URL(listingUrl).origin;
  const rows = parseAfdbListing(html, baseUrl).slice(0, 40);

  if (rows.length === 0) {
    throw new Error("No AfDB notices found on listing page");
  }

  return rows.map((row) => {
    const slug = row.url.split("/").pop() ?? row.title;
    const publishedAt = row.publishedAt ?? new Date();
    const deadline = new Date(
      publishedAt.getTime() + 45 * 24 * 60 * 60 * 1000,
    );

    return {
      referenceId: `afdb-${slug}`.slice(0, 120),
      title: row.title,
      description: row.title,
      category: inferCategory(row.title),
      deadline,
      url: row.url,
      projectLabel: "African Development Bank",
    };
  });
}
