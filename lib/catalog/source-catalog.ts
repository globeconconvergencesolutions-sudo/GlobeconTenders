export type CatalogRegion = "Kenya" | "Africa" | "Global";
export type CatalogCategory =
  | "Government"
  | "Development Bank"
  | "Aggregator"
  | "International";

export type CatalogSourceStatus = "live" | "beta" | "browse";

export type CatalogSource = {
  id: string;
  name: string;
  description: string;
  region: CatalogRegion;
  category: CatalogCategory;
  adapter:
    | "world-bank"
    | "tender-yetu"
    | "kenya-ppip"
    | "afdb-procurement"
    | "generic-rss"
    | "generic-link";
  url: string;
  feedUrl?: string;
  color: string;
  featured: boolean;
  status: CatalogSourceStatus;
  syncSupported: boolean;
};

export const SOURCE_CATALOG: CatalogSource[] = [
  {
    id: "world-bank",
    name: "World Bank",
    description:
      "Global development procurement notices from the World Bank API — 400k+ active opportunities.",
    region: "Global",
    category: "Development Bank",
    adapter: "world-bank",
    url: "https://search.worldbank.org/api/v2/procnotices",
    color: "#2563eb",
    featured: true,
    status: "live",
    syncSupported: true,
  },
  {
    id: "tender-yetu",
    name: "Tender Yetu",
    description:
      "Kenya government, parastatal, and NGO tenders aggregated daily with direct article links.",
    region: "Kenya",
    category: "Aggregator",
    adapter: "tender-yetu",
    url: "https://www.tenderyetu.com",
    color: "#f97316",
    featured: true,
    status: "live",
    syncSupported: true,
  },
  {
    id: "kenya-ppip",
    name: "Kenya PPIP (IFMIS)",
    description:
      "Official Kenya government e-procurement portal — national and county public tenders from tenders.go.ke.",
    region: "Kenya",
    category: "Government",
    adapter: "kenya-ppip",
    url: "https://tenders.go.ke",
    color: "#059669",
    featured: true,
    status: "live",
    syncSupported: true,
  },
  {
    id: "afdb-spn",
    name: "AfDB — Specific Procurement",
    description:
      "African Development Bank project notices across member countries, including Kenya opportunities.",
    region: "Africa",
    category: "Development Bank",
    adapter: "afdb-procurement",
    url: "https://www.afdb.org/en/documents/project-related-procurement/procurement-notices/specific-procurement-notices",
    color: "#009844",
    featured: true,
    status: "live",
    syncSupported: true,
  },
  {
    id: "afdb-ifb",
    name: "AfDB — Invitation for Bids",
    description:
      "Open AfDB invitation-for-bids notices for works, goods, and consultancy contracts.",
    region: "Africa",
    category: "Development Bank",
    adapter: "afdb-procurement",
    url: "https://www.afdb.org/en/documents/project-related-procurement/procurement-notices/invitation-for-bids",
    color: "#047857",
    featured: true,
    status: "live",
    syncSupported: true,
  },
  {
    id: "tender-yetu-rss",
    name: "Tender Yetu RSS",
    description:
      "RSS backup feed for Tender Yetu — useful when the WordPress API is slow or rate-limited.",
    region: "Kenya",
    category: "Aggregator",
    adapter: "generic-rss",
    url: "https://www.tenderyetu.com/feed/",
    feedUrl: "https://www.tenderyetu.com/feed/",
    color: "#ea580c",
    featured: false,
    status: "live",
    syncSupported: true,
  },
  {
    id: "undp-africa",
    name: "UNDP Africa Procurement",
    description:
      "Live UNDP procurement notices across Africa — hourly RSS feed with direct notice links.",
    region: "Africa",
    category: "International",
    adapter: "generic-rss",
    url: "https://procurement-notices.undp.org/",
    feedUrl: "https://procurement-notices.undp.org/rss_feeds/RAF.xml",
    color: "#0369a1",
    featured: true,
    status: "live",
    syncSupported: true,
  },
  {
    id: "undp-global",
    name: "UNDP Global Procurement",
    description:
      "All UNDP business opportunities worldwide via the official procurement RSS feed.",
    region: "Global",
    category: "International",
    adapter: "generic-rss",
    url: "https://procurement-notices.undp.org/",
    feedUrl: "https://procurement-notices.undp.org/rss_feeds/rss.xml",
    color: "#0284c7",
    featured: false,
    status: "live",
    syncSupported: true,
  },
  {
    id: "ungm",
    name: "UNGM (UN Global Marketplace)",
    description:
      "United Nations procurement portal — browse opportunities; programmatic sync requires UNGM API registration.",
    region: "Global",
    category: "International",
    adapter: "generic-link",
    url: "https://www.ungm.org/Public/Notice",
    color: "#0ea5e9",
    featured: false,
    status: "browse",
    syncSupported: false,
  },
];

export function getCatalogSource(id: string): CatalogSource | undefined {
  return SOURCE_CATALOG.find((source) => source.id === id);
}

export function catalogSlugFor(source: CatalogSource): string {
  return source.id;
}
