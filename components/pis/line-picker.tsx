"use client";

import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";

export type PickerLine = {
  id: number;
  name: string;
  fieldName: string;
  relevance: string;
};

export function LinePicker({
  lines,
  selected,
  onToggle,
  canEdit,
  emptyHint = "Search for a service line.",
}: {
  lines: PickerLine[];
  selected: Set<number>;
  onToggle: (id: number) => void;
  canEdit: boolean;
  emptyHint?: string;
}) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = q
      ? lines.filter(
          (line) =>
            line.name.toLowerCase().includes(q) ||
            line.fieldName.toLowerCase().includes(q),
        )
      : lines;
    return pool.slice(0, 80);
  }, [lines, query]);

  return (
    <div className="space-y-4">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search fields or service lines"
        className="h-11 max-w-md"
        aria-label="Search service lines"
      />
      {visible.length === 0 ? (
        <p className="text-sm leading-relaxed text-slate-500">{emptyHint}</p>
      ) : (
        <ul className="max-h-[36rem] space-y-2 overflow-auto pr-1">
          {visible.map((line) => (
            <li key={line.id}>
              <label className="flex cursor-pointer items-start gap-4 rounded-xl border border-slate-200 bg-white px-4 py-4 hover:border-slate-300">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selected.has(line.id)}
                  disabled={!canEdit}
                  onChange={() => onToggle(line.id)}
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">{line.name}</span>
                  <span className="mt-1 block text-sm text-slate-500">
                    {line.fieldName} · {line.relevance === "core" ? "Core" : "Other"}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
