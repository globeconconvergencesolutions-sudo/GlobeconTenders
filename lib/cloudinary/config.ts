import { loadEnv } from "@/lib/env";

loadEnv();

/** Cloudinary root folder configured in the GlobeconTender upload preset. */
export const CLOUDINARY_ROOT_FOLDER =
  process.env.CLOUDINARY_ROOT_FOLDER ?? "Globeconcs";

/** Signed upload preset name from Cloudinary dashboard. */
export const CLOUDINARY_UPLOAD_PRESET =
  process.env.CLOUDINARY_UPLOAD_PRESET ?? "GlobeconTender";

/**
 * Structured Cloudinary folder layout under Globeconcs/
 *
 * Globeconcs/
 *   sources/documents/{source-slug}/   — uploaded tender bulletins/PDFs
 *   branding/{org-slug}/               — workspace logos & login covers
 *   exports/                           — CSV/Excel exports (future)
 *   tenders/attachments/               — per-tender files (future)
 */
export const CLOUDINARY_FOLDERS = {
  root: CLOUDINARY_ROOT_FOLDER,
  sourceDocuments: `${CLOUDINARY_ROOT_FOLDER}/sources/documents`,
  branding: `${CLOUDINARY_ROOT_FOLDER}/branding`,
  exports: `${CLOUDINARY_ROOT_FOLDER}/exports`,
  tenderAttachments: `${CLOUDINARY_ROOT_FOLDER}/tenders/attachments`,
} as const;

export function getSourceDocumentFolder(sourceSlug: string): string {
  return `${CLOUDINARY_FOLDERS.sourceDocuments}/${sourceSlug}`;
}

export function getBrandingFolder(orgSlug: string): string {
  const safe = orgSlug.replace(/[^a-zA-Z0-9_-]/g, "-").toLowerCase() || "workspace";
  return `${CLOUDINARY_FOLDERS.branding}/${safe}`;
}
