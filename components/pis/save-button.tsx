"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function SaveButton({
  label,
  pendingLabel = "Saving…",
  onSave,
}: {
  label: string;
  pendingLabel?: string;
  onSave: () => Promise<void>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <Button
        type="button"
        className="h-11 px-5"
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(null);
          void onSave()
            .then(() => router.refresh())
            .catch((reason: unknown) => {
              setError(reason instanceof Error ? reason.message : "Could not save.");
            })
            .finally(() => setPending(false));
        }}
      >
        {pending ? pendingLabel : label}
      </Button>
      {error && <p className="text-sm text-rose-700">{error}</p>}
    </div>
  );
}

export async function postJson(url: string, body: unknown, method = "POST") {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error ?? "Could not save.");
  }
}
