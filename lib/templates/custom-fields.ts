import type {
  CustomFieldDefinition,
  CustomFieldValues,
} from "@/lib/db/schema";

export function getCardCustomFields(
  definitions: CustomFieldDefinition[],
  values: CustomFieldValues | null | undefined,
): Array<{ key: string; label: string; display: string }> {
  if (!values || definitions.length === 0) return [];

  return definitions
    .filter((field) => field.showOnCard !== false)
    .map((field) => {
      const raw = values[field.key];
      if (raw == null || raw === "") return null;
      return {
        key: field.key,
        label: field.label,
        display: formatCustomFieldValue(field, raw),
      };
    })
    .filter((row): row is { key: string; label: string; display: string } =>
      Boolean(row),
    );
}

function formatCustomFieldValue(
  field: CustomFieldDefinition,
  value: string | number | boolean,
): string {
  if (field.type === "date" && typeof value === "string") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    }
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
