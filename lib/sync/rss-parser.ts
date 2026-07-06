export type RssItem = {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  guid?: string;
};

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function readTag(block: string, tag: string): string | undefined {
  const cdata = block.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"),
  );
  if (cdata?.[1]) return cdata[1].trim();

  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plain?.[1]?.trim();
}

export function parseRssFeed(xml: string): RssItem[] {
  const items: RssItem[] = [];
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];

  for (const block of itemBlocks) {
    const aboutMatch = block.match(/<item[^>]+rdf:about="([^"]+)"/i);
    const title = readTag(block, "title");
    const link = readTag(block, "link") ?? aboutMatch?.[1];
    if (!title || !link) continue;

    items.push({
      title: stripTags(title),
      link: stripTags(link),
      description: readTag(block, "description")
        ? stripTags(readTag(block, "description")!)
        : undefined,
      pubDate: readTag(block, "pubDate"),
      guid: readTag(block, "guid"),
    });
  }

  if (items.length > 0) return items;

  const atomEntries = xml.match(/<entry[\s\S]*?<\/entry>/gi) ?? [];
  for (const block of atomEntries) {
    const title = readTag(block, "title");
    const linkMatch = block.match(/<link[^>]+href="([^"]+)"/i);
    if (!title || !linkMatch?.[1]) continue;

    items.push({
      title: stripTags(title),
      link: linkMatch[1],
      description: readTag(block, "summary")
        ? stripTags(readTag(block, "summary")!)
        : undefined,
      pubDate: readTag(block, "updated") ?? readTag(block, "published"),
      guid: readTag(block, "id"),
    });
  }

  return items;
}
