"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { controlClass, Field } from "@/components/pis/fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EvidenceForm({
  related,
}: {
  related: Array<{ value: string; label: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = event.currentTarget;
    const response = await fetch("/api/pis/evidence", {
      method: "POST",
      body: new FormData(form),
    });
    setPending(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not save the document.");
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <form className="grid gap-6" onSubmit={onSubmit}>
      <Field label="Document name">
        <Input className="h-11" name="name" required />
      </Field>
      <Field label="Type" hint="Registration, CV, certificate, audited accounts, or another label you use.">
        <Input className="h-11" name="documentType" required />
      </Field>
      <Field label="File" hint="Optional if you already have a link. PDF and images are stored with the workspace files.">
        <Input className="h-11" name="file" type="file" />
      </Field>
      <Field label="Link" hint="Use this when the file already lives somewhere else.">
        <Input className="h-11" name="url" type="url" placeholder="https://" />
      </Field>
      <Field label="Related record">
        <select className={controlClass} name="relatedLabel" defaultValue="">
          <option value="">None</option>
          {related.map((item) => (
            <option key={item.value} value={item.label}>
              {item.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Issued">
        <Input className="h-11" name="issuedOn" type="date" />
      </Field>
      <Field label="Expiry">
        <Input className="h-11" name="expiresOn" type="date" />
      </Field>
      <Field label="Confidentiality" hint="Read-only users see internal records only.">
        <select className={controlClass} name="confidentiality" defaultValue="internal">
          <option value="internal">Internal</option>
          <option value="restricted">Restricted</option>
          <option value="finance">Finance</option>
        </select>
      </Field>
      <Field label="Notes">
        <textarea className={`${controlClass} min-h-24 py-3`} name="notes" />
      </Field>
      {error && <p className="text-sm text-rose-700">{error}</p>}
      <Button type="submit" className="h-11 w-fit px-5" disabled={pending}>
        {pending ? "Saving…" : "Add evidence"}
      </Button>
    </form>
  );
}

export function DeleteEvidenceButton({ id }: { id: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      className="text-sm text-slate-500 underline-offset-4 hover:underline"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void fetch("/api/pis/evidence", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }).then(() => {
          setPending(false);
          router.refresh();
        });
      }}
    >
      {pending ? "Removing…" : "Remove"}
    </button>
  );
}
