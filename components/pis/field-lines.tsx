"use client";

import { useState } from "react";

import { LinePicker, type PickerLine } from "@/components/pis/line-picker";
import { postJson, SaveButton } from "@/components/pis/save-button";

export function FieldLines({
  watchlistId,
  watchlistName,
  selectedIds,
  lines,
  canEdit,
}: {
  watchlistId: number | null;
  watchlistName: string;
  selectedIds: number[];
  lines: PickerLine[];
  canEdit: boolean;
}) {
  const [selected, setSelected] = useState(() => new Set(selectedIds));

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Service lines</h2>
      <p className="mt-2 mb-6 text-sm leading-relaxed text-slate-600">
        Saving updates the active watchlist, {watchlistName}. Other fields keep the lines already selected.
      </p>
      <LinePicker
        lines={lines}
        selected={selected}
        onToggle={toggle}
        canEdit={canEdit}
        emptyHint="No visible lines in this field."
      />
      {canEdit && (
        <div className="mt-6">
          <SaveButton
            label="Update watchlist"
            onSave={() =>
              postJson("/api/pis/watchlists", {
                id: watchlistId ?? undefined,
                name: watchlistName,
                lineIds: [...selected],
                activate: true,
              })
            }
          />
        </div>
      )}
    </section>
  );
}
