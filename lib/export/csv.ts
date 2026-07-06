import type { TenderWithSource } from "@/lib/db/schema";
import { formatDeadline } from "@/lib/utils";

function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function tendersToCsv(rows: TenderWithSource[]): string {
  const headers = [
    "Reference",
    "Title",
    "Source",
    "Category",
    "Region",
    "Country",
    "Deadline",
    "Match Score",
    "Saved",
    "Status",
    "URL",
    "Project Label",
  ];

  const lines = rows.map((row) =>
    [
      row.referenceId,
      row.title,
      row.sourceName,
      row.category,
      row.regionLabel ?? row.regionName ?? "",
      row.countryLabel ?? row.countryName ?? "",
      formatDeadline(row.deadline),
      row.matchScore,
      row.saved ? "Yes" : "No",
      row.isClosed ? "Closed" : "Open",
      row.url ?? "",
      row.projectLabel,
    ]
      .map(escapeCsv)
      .join(","),
  );

  return [headers.join(","), ...lines].join("\r\n");
}
