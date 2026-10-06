export type SourceReading = {
  reads: string;
  notice: string;
};

function pathnameOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const path = new URL(url).pathname || "/";
    return path.endsWith("/") && path.length > 1 ? path.slice(0, -1) : path;
  } catch {
    return null;
  }
}

/**
 * Plain-language account of where a connected source is read.
 * Listing pages and notice pages are often different paths.
 */
export function describeSourceReading(
  adapter: string,
  url: string | null | undefined,
): SourceReading {
  const path = pathnameOf(url);

  switch (adapter) {
    case "world-bank":
      return {
        reads: "The World Bank procurement search API.",
        notice:
          "Each public notice opens at /en/projects-operations/procurement-detail/{id}. The older /procurement/{id} path is left unused.",
      };
    case "tender-yetu":
      return {
        reads: "The Tender Yetu post list.",
        notice:
          "Each public notice is a page on the site root, in the shape /{organization}-tender-{name}/.",
      };
    case "kenya-ppip":
      return {
        reads: "The Kenya portal API at /api/explored.",
        notice: "Each public notice is /tenders/{id} on tenders.go.ke.",
      };
    case "afdb-procurement":
      return {
        reads: path
          ? `The AfDB listing at ${path}.`
          : "The AfDB listing stored on this source.",
        notice: "Each notice is a document page under /en/documents/.",
      };
    case "generic-rss":
      return {
        reads: path
          ? `The feed at ${path}. That path is the list we sync. It is separate from the site home.`
          : "The RSS address stored on this source.",
        notice:
          "Each notice keeps the link the feed published. UNDP notices use view_negotiation.cfm. A careers feed would be read from its own path, such as /careers, and would not be mixed with a tender list at /.",
      };
    case "document":
      return {
        reads: "An uploaded file.",
        notice: "There is no public listing path for this source.",
      };
    default:
      return {
        reads: path
          ? `The address stored for this source (${path}).`
          : "An address an administrator still has to attach to an existing connector.",
        notice:
          "Approving a candidate uses a connector we already run. It does not invent a new crawler, and it keeps that source’s own listing path.",
      };
  }
}
