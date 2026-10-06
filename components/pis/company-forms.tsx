"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { controlClass, Field } from "@/components/pis/fields";
import { postJson, SaveButton } from "@/components/pis/save-button";
import { Input } from "@/components/ui/input";
import { verificationLabel } from "@/lib/pis/format";

type Profile = {
  legalName: string | null;
  registrationNumber: string | null;
  country: string | null;
  locations: string | null;
  yearsOperating: number | null;
  description: string | null;
  website: string | null;
  contacts: string | null;
};

type Line = { id: number; name: string; fieldName: string };

export function ProfileForm({ profile }: { profile: Profile | null }) {
  const [values, setValues] = useState({
    legalName: profile?.legalName ?? "",
    registrationNumber: profile?.registrationNumber ?? "",
    country: profile?.country ?? "",
    locations: profile?.locations ?? "",
    yearsOperating: profile?.yearsOperating?.toString() ?? "",
    website: profile?.website ?? "",
    contacts: profile?.contacts ?? "",
    description: profile?.description ?? "",
  });

  function set(name: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [name]: value }));
  }

  return (
    <form className="grid gap-6" onSubmit={(event) => event.preventDefault()}>
      <Field label="Legal name" hint="The name a tender should be compared with.">
        <Input className="h-11" value={values.legalName} onChange={(event) => set("legalName", event.target.value)} />
      </Field>
      <Field label="Country">
        <Input className="h-11" value={values.country} onChange={(event) => set("country", event.target.value)} />
      </Field>
      <Field label="What the firm does" hint="A few sentences about the work you do. An invitation cannot be compared until this is saved.">
        <textarea className={`${controlClass} min-h-28 py-3`} value={values.description} onChange={(event) => set("description", event.target.value)} />
      </Field>
      <Field label="Website">
        <Input className="h-11" value={values.website} onChange={(event) => set("website", event.target.value)} />
      </Field>
      <details className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-800">
          Registration, other locations, and contacts
        </summary>
        <div className="mt-5 grid gap-6">
          <Field label="Registration number">
            <Input className="h-11" value={values.registrationNumber} onChange={(event) => set("registrationNumber", event.target.value)} />
          </Field>
          <Field label="Other locations">
            <Input className="h-11" value={values.locations} onChange={(event) => set("locations", event.target.value)} />
          </Field>
          <Field label="Years operating">
            <Input className="h-11" type="number" min={0} value={values.yearsOperating} onChange={(event) => set("yearsOperating", event.target.value)} />
          </Field>
          <Field label="Contacts">
            <Input className="h-11" value={values.contacts} onChange={(event) => set("contacts", event.target.value)} />
          </Field>
        </div>
      </details>
      <SaveButton
        label="Save profile"
        onSave={() =>
          postJson(
            "/api/pis/company",
            {
              ...values,
              yearsOperating: values.yearsOperating ? Number(values.yearsOperating) : null,
            },
            "PUT",
          )
        }
      />
    </form>
  );
}

export function CapabilityForm({ lines }: { lines: Line[] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [lineId, setLineId] = useState<number | null>(null);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return lines
      .filter((line) => line.name.toLowerCase().includes(q) || line.fieldName.toLowerCase().includes(q))
      .slice(0, 8);
  }, [lines, query]);
  const chosen = lines.find((line) => line.id === lineId);

  return (
    <form className="mt-6 grid gap-6 border-t border-slate-100 pt-6" onSubmit={(event) => event.preventDefault()}>
      <Field label="Capability">
        <Input className="h-11" value={name} onChange={(event) => setName(event.target.value)} />
      </Field>
      <Field label="Description">
        <textarea className={`${controlClass} min-h-24 py-3`} value={description} onChange={(event) => setDescription(event.target.value)} />
      </Field>
      <Field label="Service line" hint="Search the catalog. The full list stays off this page.">
        <Input className="h-11" value={query} placeholder="Search service lines" onChange={(event) => setQuery(event.target.value)} />
      </Field>
      {chosen && <p className="text-sm text-slate-600">Linked to {chosen.name}</p>}
      {matches.length > 0 && (
        <ul className="space-y-2">
          {matches.map((line) => (
            <li key={line.id}>
              <button
                type="button"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-sm hover:bg-slate-50"
                onClick={() => {
                  setLineId(line.id);
                  setQuery(line.name);
                }}
              >
                <span className="block font-medium">{line.name}</span>
                <span className="text-slate-500">{line.fieldName}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <SaveButton
        label="Add capability"
        onSave={async () => {
          await postJson("/api/pis/company", {
            kind: "capability",
            name,
            description,
            catalogServiceLineId: lineId,
          });
          setName("");
          setDescription("");
          setQuery("");
          setLineId(null);
        }}
      />
    </form>
  );
}

export function SimpleRecordForm({
  kind,
  title,
  fields,
}: {
  kind: "project" | "personnel" | "certification";
  title: string;
  fields: Array<{ name: string; label: string; hint?: string; type?: string }>;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  return (
    <form className="mt-6 grid gap-6 border-t border-slate-100 pt-6" onSubmit={(event) => event.preventDefault()}>
      <h3 className="text-base font-medium text-slate-900">{title}</h3>
      {fields.map((field) => (
        <Field key={field.name} label={field.label} hint={field.hint}>
          {field.type === "textarea" ? (
            <textarea
              className={`${controlClass} min-h-24 py-3`}
              value={values[field.name] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            />
          ) : (
            <Input
              className="h-11"
              type={field.type ?? "text"}
              value={values[field.name] ?? ""}
              onChange={(event) => setValues((current) => ({ ...current, [field.name]: event.target.value }))}
            />
          )}
        </Field>
      ))}
      <SaveButton
        label={`Add ${kind === "personnel" ? "person" : kind}`}
        onSave={async () => {
          const body: Record<string, string | number | null> = { kind };
          for (const field of fields) {
            const raw = values[field.name] ?? "";
            body[field.name] = field.type === "number" ? (raw ? Number(raw) : null) : raw;
          }
          await postJson("/api/pis/company", body);
          setValues({});
        }}
      />
    </form>
  );
}

export function VerifySelect({
  record,
  id,
  value,
}: {
  record: "capability" | "project" | "personnel" | "certification";
  id: number;
  value: string;
}) {
  const router = useRouter();
  return (
    <label className="mt-3 block max-w-xs space-y-2 text-sm">
      <span className="text-slate-500">Verification</span>
      <select
        className={controlClass}
        defaultValue={value}
        onChange={(event) => {
          void postJson("/api/pis/company", {
            kind: "verify",
            record,
            id,
            verificationStatus: event.target.value,
          }).then(() => router.refresh());
        }}
      >
        <option value="self_declared">{verificationLabel("self_declared")}</option>
        <option value="unverified">{verificationLabel("unverified")}</option>
        <option value="verified">{verificationLabel("verified")}</option>
      </select>
    </label>
  );
}
