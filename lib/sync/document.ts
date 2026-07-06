import type { Source } from "@/lib/db/schema";
import {
  detectDocumentFormat,
  parseDocumentBuffer,
} from "@/lib/sync/document-parser";
import type { SyncTenderItem } from "@/lib/sync/types";

function fileNameFromSource(source: Source): string {
  if (source.cloudinaryPublicId) {
    const parts = source.cloudinaryPublicId.split("/");
    return parts[parts.length - 1] ?? source.name;
  }
  if (source.cloudinaryUrl) {
    try {
      const pathname = new URL(source.cloudinaryUrl).pathname;
      return pathname.split("/").pop() ?? source.name;
    } catch {
      return source.name;
    }
  }
  return source.name;
}

export async function fetchDocumentSourceTenders(
  source: Source,
): Promise<SyncTenderItem[]> {
  if (!source.cloudinaryUrl) {
    throw new Error("Document source has no Cloudinary URL");
  }

  const response = await fetch(source.cloudinaryUrl, {
    headers: { Accept: "*/*" },
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch document (${response.status})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const fileName = fileNameFromSource(source);
  const format = detectDocumentFormat(fileName);

  if (format === "unknown") {
    throw new Error("Unsupported document format on stored source");
  }

  return parseDocumentBuffer(buffer, fileName, {
    sourceId: source.id,
    sourceName: source.name,
    documentUrl: source.cloudinaryUrl,
    publicId: source.cloudinaryPublicId,
  });
}
