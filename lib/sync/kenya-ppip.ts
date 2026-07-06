import type { SyncTenderItem } from "@/lib/sync/types";

const API_BASE = "https://tenders.go.ke/api/explored";
const PAGES_FROM_END = 4;
const PER_PAGE = 25;

type PpipTender = {
  id: number;
  tender_ref: string;
  title: string;
  close_at: string;
  description?: string | null;
  procurement_category?: { title?: string };
  pe?: { name?: string };
};

type PpipResponse = {
  current_page: number;
  last_page: number;
  data: PpipTender[];
};

async function fetchExploredPage(page: number): Promise<PpipResponse> {
  const params = new URLSearchParams({
    page: String(page),
    itemsPerPage: String(PER_PAGE),
    clauses: "{}",
    rangedClauses: "{}",
    items: "[]",
    topics: "[]",
  });

  const response = await fetch(`${API_BASE}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "GlobeconTenderWatch/2.0",
    },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Kenya PPIP API returned ${response.status}`);
  }

  return (await response.json()) as PpipResponse;
}

export async function fetchKenyaPpipTenders(): Promise<SyncTenderItem[]> {
  const first = await fetchExploredPage(1);
  const lastPage = first.last_page || 1;
  const startPage = Math.max(1, lastPage - PAGES_FROM_END + 1);

  const pages = await Promise.all(
    Array.from({ length: lastPage - startPage + 1 }, (_, index) =>
      fetchExploredPage(startPage + index),
    ),
  );

  const now = new Date();
  const seen = new Set<number>();
  const items: SyncTenderItem[] = [];

  for (const page of pages) {
    for (const row of page.data) {
      if (seen.has(row.id)) continue;
      seen.add(row.id);

      const deadline = new Date(row.close_at);
      if (Number.isNaN(deadline.getTime()) || deadline < now) continue;

      items.push({
        referenceId: `ppip-${row.tender_ref}`.replace(/\s+/g, "-").slice(0, 120),
        title: row.title,
        description: row.description ?? undefined,
        category: row.procurement_category?.title ?? "Kenya Government",
        deadline,
        url: `https://tenders.go.ke/tenders/detail/${row.id}`,
        projectLabel: row.pe?.name
          ? `Kenya PPIP · ${row.pe.name.trim()}`
          : "Kenya PPIP · IFMIS",
      });
    }
  }

  items.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());

  if (items.length === 0) {
    throw new Error(
      "No open Kenya PPIP tenders found — portal API may be temporarily unavailable",
    );
  }

  return items.slice(0, 60);
}
