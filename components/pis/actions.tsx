"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { controlClass, Field } from "@/components/pis/fields";
import { postJson, SaveButton } from "@/components/pis/save-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RepairCoreButton({ watchlistId }: { watchlistId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="h-11"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void postJson("/api/pis/watchlists/repair", { id: watchlistId })
          .then(() => router.refresh())
          .finally(() => setPending(false));
      }}
    >
      {pending ? "Restoring…" : "Restore Globecon Core lines"}
    </Button>
  );
}

export function HideLineButton({ lineId, hidden }: { lineId: number; hidden: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-slate-500 underline-offset-4 hover:underline"
      onClick={() => {
        void postJson("/api/pis/catalog/hide", { lineId, hidden: !hidden }).then(() =>
          router.refresh(),
        );
      }}
    >
      {hidden ? "Show in picker" : "Hide from picker"}
    </button>
  );
}

export function MarkReadButton({ alertKey }: { alertKey: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-blue-700"
      onClick={() => {
        void postJson("/api/pis/alerts/read", { key: alertKey }).then(() => router.refresh());
      }}
    >
      Mark read
    </button>
  );
}

export function NoteForm({ tenderId }: { tenderId: number }) {
  const [body, setBody] = useState("");
  return (
    <form className="grid gap-4" onSubmit={(event) => event.preventDefault()}>
      <Field label="Note" hint="Visible to your workspace. This is separate from pipeline notes.">
        <textarea
          className={`${controlClass} min-h-28 py-3`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </Field>
      <SaveButton
        label="Save note"
        onSave={async () => {
          await postJson("/api/pis/notes", { tenderId, body });
          setBody("");
        }}
      />
    </form>
  );
}

export function AcceptRequirementButton({ id }: { id: number }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-sm text-blue-700"
      onClick={() => {
        void postJson("/api/pis/requirements/accept", { id }).then(() => router.refresh());
      }}
    >
      Accept suggestion
    </button>
  );
}

export function RelationButtons({ id }: { id: number }) {
  const router = useRouter();
  function setStatus(status: "confirmed" | "dismissed") {
    void postJson("/api/pis/relations", { id, status }).then(() => router.refresh());
  }
  return (
    <div className="mt-4 flex gap-4">
      <button type="button" className="text-sm text-blue-700" onClick={() => setStatus("confirmed")}>
        Confirm link
      </button>
      <button type="button" className="text-sm text-slate-500" onClick={() => setStatus("dismissed")}>
        Dismiss
      </button>
    </div>
  );
}

export function SourceCandidateForm({ canApprove }: { canApprove: boolean }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  return (
    <form className="grid gap-6" onSubmit={(event) => event.preventDefault()}>
      <Field label="Name" hint="Saving a candidate does not crawl the site.">
        <Input className="h-11" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Official URL">
        <Input className="h-11" value={url} onChange={(event) => setUrl(event.target.value)} />
      </Field>
      <SaveButton
        label="Save candidate"
        onSave={async () => {
          await postJson("/api/pis/sources", { name, url });
          setName("");
          setUrl("");
        }}
      />
      {canApprove ? null : (
        <p className="text-sm text-slate-500">An administrator approves a candidate onto an existing connector.</p>
      )}
    </form>
  );
}

export function ApproveSourceForm({ id }: { id: number }) {
  const [adapter, setAdapter] = useState("generic-link");
  return (
    <form className="mt-4 grid gap-4" onSubmit={(event) => event.preventDefault()}>
      <Field label="Existing connector" hint="Approval turns the candidate on. It does not invent a new crawler.">
        <select className={controlClass} value={adapter} onChange={(event) => setAdapter(event.target.value)}>
          <option value="generic-link">Generic link</option>
          <option value="generic-rss">Generic RSS</option>
          <option value="world-bank">World Bank</option>
          <option value="tender-yetu">TenderYetu</option>
          <option value="kenya-ppip">Kenya PPIP</option>
          <option value="afdb-procurement">AfDB</option>
          <option value="document">Document</option>
        </select>
      </Field>
      <SaveButton
        label="Approve source"
        onSave={() => postJson("/api/pis/sources", { id, adapter, approve: true })}
      />
    </form>
  );
}
