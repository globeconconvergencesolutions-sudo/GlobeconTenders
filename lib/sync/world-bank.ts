import type { SyncTenderItem } from "@/lib/sync/types";

const WORLD_BANK_PROCUREMENT_URL =
  "https://search.worldbank.org/api/v2/procnotices";

export async function fetchWorldBankTenders(
  rows = 50,
): Promise<SyncTenderItem[]> {
  const url = new URL(WORLD_BANK_PROCUREMENT_URL);
  url.searchParams.set("format", "json");
  url.searchParams.set("rows", String(rows));
  url.searchParams.set(
    "fl",
    "id,bid_description,project_name,notice_type,submission_date,url",
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
    documents?: Record<
      string,
      {
        id?: string;
        bid_description?: string;
        project_name?: string;
        notice_type?: string;
        submission_date?: string;
        url?: string;
      }
    >;
    procnotices?: Array<{
      id?: string;
      bid_description?: string;
      project_name?: string;
      notice_type?: string;
      submission_date?: string;
      url?: string;
    }>;
  };

  const notices =
    payload.procnotices ??
    (payload.documents ? Object.values(payload.documents) : []);

  return notices
    .filter((doc) => doc.id && (doc.bid_description || doc.project_name))
    .map((doc) => {
      const deadline = doc.submission_date
        ? new Date(doc.submission_date)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      return {
        referenceId: String(doc.id),
        title: doc.bid_description ?? doc.project_name ?? "Untitled notice",
        description: doc.project_name,
        category: doc.notice_type ?? "Development",
        deadline,
        url:
          doc.url ??
          `https://projects.worldbank.org/en/projects-operations/procurement/${doc.id}`,
        projectLabel: "World Bank Project",
      };
    });
}
