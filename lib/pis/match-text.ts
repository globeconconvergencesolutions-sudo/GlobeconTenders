/** Text the matcher reads. Safe to import from client components. */
export function matchHaystack(row: {
  title: string;
  description?: string | null;
  category?: string | null;
  titleEn?: string | null;
  descriptionEn?: string | null;
}): string {
  const title = row.titleEn?.trim() || row.title;
  const description = row.descriptionEn?.trim() || row.description || "";
  return `${title} ${description} ${row.category ?? ""}`.replace(/\s+/g, " ").trim();
}
