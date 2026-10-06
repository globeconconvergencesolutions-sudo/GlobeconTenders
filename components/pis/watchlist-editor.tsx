"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { LinePicker } from "@/components/pis/line-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Line = {
  id: number;
  name: string;
  fieldName: string;
  relevance: string;
};

type WatchlistEditorProps = {
  watchlistId: number | null;
  name: string;
  selectedIds: number[];
  lines: Line[];
  canEdit: boolean;
};

export function WatchlistEditor({
  watchlistId,
  name: initialName,
  selectedIds,
  lines,
  canEdit,
}: WatchlistEditorProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState(() => new Set(selectedIds));
  const [message, setMessage] = useState<string | null>(null);

  const fields = useMemo(() => {
    const names = new Set<string>();
    for (const id of selected) {
      const line = lines.find((item) => item.id === id);
      if (line) names.add(line.fieldName);
    }
    return [...names];
  }, [lines, selected]);

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function save() {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/pis/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: watchlistId ?? undefined,
          name,
          lineIds: [...selected],
          activate: true,
        }),
      });
      if (!response.ok) {
        setMessage("Could not save the watchlist.");
        return;
      }
      setMessage("Watchlist saved and set active. The home list uses it.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <Input
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={!canEdit}
        className="h-11 max-w-md"
        aria-label="Watchlist name"
      />
      <p className="text-sm leading-relaxed text-slate-600">
        {selected.size} service lines selected across {fields.length} fields.
        Keywords are curated. Lines without keywords stay in the watchlist but
        will not match until a phrase is added.
      </p>
      <LinePicker lines={lines} selected={selected} onToggle={toggle} canEdit={canEdit} />
      {canEdit && (
        <Button onClick={save} disabled={pending || name.trim().length < 2}>
          {pending ? "Saving…" : "Save watchlist"}
        </Button>
      )}
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}
