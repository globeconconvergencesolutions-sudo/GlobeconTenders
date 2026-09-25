/**
 * Per-adapter notice URL builders + normalizers.
 * Keep each portal’s public notice shape in one place so sync + backfills stay aligned.
 */

export type NoticeUrlAdapter =
  | "world-bank"
  | "tender-yetu"
  | "kenya-ppip"
  | "afdb-procurement"
  | "generic-rss"
  | "document";

export type AdapterUrlContract = {
  adapter: NoticeUrlAdapter;
  /** How we prefer to obtain the public notice link. */
  strategy: "api-field" | "constructed" | "feed-link" | "none";
  /** Human note for operators / future adapters. */
  notes: string;
  /** Example public URL pattern (documentation). */
  example?: string;
  /** Rewrite known-bad stored URLs into the current canonical form. */
  normalizeStoredUrl?: (url: string, referenceId?: string) => string | null;
  /** Build a fallback when the portal payload has no link. */
  buildFallback?: (referenceId: string) => string | null;
};

const WB_BROKEN =
  /^https?:\/\/projects\.worldbank\.org\/en\/projects-operations\/procurement\/([^/?#]+)\/?$/i;
const WB_DETAIL =
  "https://projects.worldbank.org/en/projects-operations/procurement-detail";

export function worldBankNoticeUrl(
  noticeId: string,
  apiUrl?: string | null,
): string {
  const fromApi = apiUrl?.trim();
  if (fromApi && /^https?:\/\//i.test(fromApi)) {
    return normalizeWorldBankUrl(fromApi, noticeId) ?? fromApi;
  }
  return `${WB_DETAIL}/${encodeURIComponent(noticeId)}`;
}

export function normalizeWorldBankUrl(
  url: string,
  referenceId?: string,
): string | null {
  const broken = url.match(WB_BROKEN);
  if (broken) {
    return `${WB_DETAIL}/${broken[1]}`;
  }
  if (
    referenceId &&
    url.includes("/projects-operations/procurement/") &&
    !url.includes("/procurement-detail/")
  ) {
    return `${WB_DETAIL}/${encodeURIComponent(referenceId)}`;
  }
  return null;
}

export const ADAPTER_URL_CONTRACTS: Record<NoticeUrlAdapter, AdapterUrlContract> =
  {
    "world-bank": {
      adapter: "world-bank",
      strategy: "constructed",
      notes:
        "Search API rarely returns url; build procurement-detail/{id}. Never use /procurement/{id} (404).",
      example: `${WB_DETAIL}/OP00470639`,
      normalizeStoredUrl: normalizeWorldBankUrl,
      buildFallback: (id) => `${WB_DETAIL}/${encodeURIComponent(id)}`,
    },
    "tender-yetu": {
      adapter: "tender-yetu",
      strategy: "api-field",
      notes: "Use WordPress post.link as-is (canonical tender page).",
      example:
        "https://www.tenderyetu.com/{org}-tender-{slug}/",
    },
    "kenya-ppip": {
      adapter: "kenya-ppip",
      strategy: "constructed",
      notes: "Public page is tenders.go.ke/tenders/{numericId} from explored API id.",
      example: "https://tenders.go.ke/tenders/12345",
      buildFallback: (id) => {
        const numeric = id.replace(/^ppip-/i, "");
        // Prefer numeric portal id if reference embeds it; otherwise leave unset.
        if (/^\d+$/.test(numeric)) {
          return `https://tenders.go.ke/tenders/${numeric}`;
        }
        return null;
      },
    },
    "afdb-procurement": {
      adapter: "afdb-procurement",
      strategy: "feed-link",
      notes: "Absolute https://www.afdb.org/en/documents/… from listing HTML.",
      example:
        "https://www.afdb.org/en/documents/spn-ethiopia-consultancy-services-…",
    },
    "generic-rss": {
      adapter: "generic-rss",
      strategy: "feed-link",
      notes:
        "Pass through item.link (UNDP view_negotiation.cfm, etc.). Do not invent paths.",
      example:
        "https://procurement-notices.undp.org/view_negotiation.cfm?nego_id=49516",
    },
    document: {
      adapter: "document",
      strategy: "none",
      notes: "Parsed from uploaded PDF/HTML; URL optional.",
    },
  };

/** Normalize a stored tender URL for a known adapter when we detect a broken pattern. */
export function normalizeAdapterNoticeUrl(
  adapter: string,
  url: string | null | undefined,
  referenceId?: string,
): string | null {
  if (!url) return null;
  const contract = ADAPTER_URL_CONTRACTS[adapter as NoticeUrlAdapter];
  if (!contract?.normalizeStoredUrl) return null;
  return contract.normalizeStoredUrl(url, referenceId);
}
