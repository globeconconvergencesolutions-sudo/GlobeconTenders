"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Json = Record<string, string | number | null | undefined>;

export function JsonForm({
  action,
  method = "POST",
  fields,
  submitLabel,
  hidden,
}: {
  action: string;
  method?: "POST" | "PUT";
  fields: Array<{ name: string; label: string; type?: string }>;
  submitLabel: string;
  hidden?: Record<string, string>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body: Json = { ...(hidden ?? {}) };
    for (const field of fields) {
      const value = String(form.get(field.name) ?? "");
      if (field.type === "number") body[field.name] = value ? Number(value) : null;
      else body[field.name] = value;
    }
    const kind = form.get("kind");
    if (typeof kind === "string" && kind) body.kind = kind;
    setPending(true);
    setError(null);
    const response = await fetch(action, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending(false);
    if (!response.ok) {
      setError("Save failed.");
      return;
    }
    event.currentTarget.reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-2 sm:grid-cols-2">
      {fields.map((field) => (
        <label key={field.name} className="text-sm">
          <span className="mb-1 block text-muted-foreground">{field.label}</span>
          <Input name={field.name} type={field.type === "number" ? "number" : "text"} />
        </label>
      ))}
      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
