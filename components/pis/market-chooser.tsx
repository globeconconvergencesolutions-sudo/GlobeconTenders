"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MarketChoice = {
  id: number;
  name: string;
  slug: string;
  guidance: string;
  lineCount: number;
};

export function MarketChooser({ fields }: { fields: MarketChoice[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return fields;
    return fields.filter(
      (field) =>
        field.name.toLowerCase().includes(needle) ||
        field.guidance.toLowerCase().includes(needle),
    );
  }, [fields, query]);

  function toggle(id: number) {
    setSelected((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/pis/markets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fieldIds: selected }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not save your markets. Try again.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Could not save your markets. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <label className="block max-w-xl space-y-2">
        <span className="text-sm font-medium text-slate-800">Search markets</span>
        <span className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Roads, healthcare, software…"
            className="h-11 w-full rounded-xl border border-input bg-white pl-10 pr-3 text-sm"
          />
        </span>
      </label>

      {visible.length === 0 ? (
        <p className="text-sm text-slate-600">No market matches that search.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((field) => {
            const on = selected.includes(field.id);
            return (
              <li key={field.id}>
                <button
                  type="button"
                  onClick={() => toggle(field.id)}
                  aria-pressed={on}
                  className={cn(
                    "h-full w-full rounded-2xl border p-5 text-left transition-colors",
                    on
                      ? "border-blue-600 bg-white ring-2 ring-blue-600"
                      : "border-slate-200 bg-white hover:border-slate-300",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="text-base font-semibold text-slate-900">{field.name}</span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                        on
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-slate-300 text-transparent",
                      )}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  </span>
                  <span className="mt-3 block text-sm leading-relaxed text-slate-600">
                    {field.guidance}
                  </span>
                  <span className="mt-3 block text-xs text-slate-500">
                    {field.lineCount} service lines
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="sticky bottom-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          {selected.length === 0
            ? "Pick at least one market."
            : `${selected.length} selected. Tenders will follow these.`}
        </p>
        <Button type="button" disabled={selected.length === 0 || saving} onClick={() => void save()}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Use these markets
        </Button>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
