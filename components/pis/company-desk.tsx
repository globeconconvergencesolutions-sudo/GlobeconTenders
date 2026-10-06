"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check } from "lucide-react";

import {
  CapabilityForm,
  ProfileForm,
  SimpleRecordForm,
  VerifySelect,
} from "@/components/pis/company-forms";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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

type Saved = {
  id: number;
  title: string;
  detail: string;
  verification: string;
};

type Brief = { fieldName: string; guidance: string };

const STEP_IDS = ["firm", "work", "projects", "people", "certificates"] as const;
type StepId = (typeof STEP_IDS)[number];

export function CompanyDesk({
  canEdit,
  profile,
  lines,
  brief,
  sampleLines,
  capabilities,
  projects,
  personnel,
  certifications,
  evidenceCount,
}: {
  canEdit: boolean;
  profile: Profile | null;
  lines: Line[];
  brief: Brief[];
  sampleLines: string[];
  capabilities: Saved[];
  projects: Saved[];
  personnel: Saved[];
  certifications: Saved[];
  evidenceCount: number;
}) {
  const steps = useMemo(
    () => [
      {
        id: "firm" as const,
        label: "The firm",
        title: "Name the firm",
        hint: "A legal name and a few sentences are enough to start. An invitation is compared with this.",
        done: Boolean(profile?.legalName?.trim() && profile.description?.trim()),
      },
      {
        id: "work" as const,
        label: "What you do",
        title: "One kind of work",
        hint: "Add a single capability. You can add more later.",
        done: capabilities.length > 0,
      },
      {
        id: "projects" as const,
        label: "Past work",
        title: "One project",
        hint: "A tender that asks for experience needs one example, not a full history.",
        done: projects.length > 0,
      },
      {
        id: "people" as const,
        label: "People",
        title: "One person",
        hint: "Who would do the work. One name is a start.",
        done: personnel.length > 0,
      },
      {
        id: "certificates" as const,
        label: "Certificates",
        title: "One certificate",
        hint: "Skip this if you have none yet. A comparison will say the proof is missing. That does not mean you cannot do the work.",
        done: certifications.length > 0,
      },
    ],
    [profile, capabilities.length, projects.length, personnel.length, certifications.length],
  );

  const [step, setStep] = useState<StepId>(
    () => steps.find((item) => !item.done)?.id ?? "firm",
  );
  const index = steps.findIndex((item) => item.id === step);
  const current = steps[index] ?? steps[0];
  const ready = steps.filter((item) => item.done).length;

  function go(next: number) {
    const target = steps[next];
    if (target) setStep(target.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-slate-600">
          {ready} of {steps.length} started
          {evidenceCount > 0 ? " · proof is already on Evidence" : ""}
        </p>
        <p className="text-sm text-slate-500">Step {index + 1} of {steps.length}</p>
      </div>

      <div role="tablist" aria-label="Company steps" className="flex gap-2 overflow-x-auto pb-1">
        {steps.map((item, itemIndex) => {
          const selected = item.id === current.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setStep(item.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-sm",
                selected
                  ? "border-blue-600 bg-blue-600 text-white"
                  : "border-slate-200 bg-white text-slate-700",
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  selected
                    ? "bg-white/20 text-white"
                    : item.done
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500",
                )}
              >
                {item.done && !selected ? <Check className="h-3 w-3" /> : itemIndex + 1}
              </span>
              {item.label}
            </button>
          );
        })}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" role="tabpanel">
        <h2 className="text-xl font-semibold text-slate-900">{current.title}</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">{current.hint}</p>

        <div className="mt-8">
          <Panel active={current.id === "firm"}>
            {canEdit ? (
              <ProfileForm profile={profile} />
            ) : profile ? (
              <dl className="space-y-4 text-sm leading-relaxed">
                <div>
                  <dt className="text-slate-500">Legal name</dt>
                  <dd>{profile.legalName ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Country</dt>
                  <dd>{profile.country ?? "Unknown"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">What the firm does</dt>
                  <dd>{profile.description ?? "Not written yet."}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-slate-600">No company profile has been saved.</p>
            )}
          </Panel>

          <Panel active={current.id === "work"}>
            <SavedList rows={capabilities} canEdit={canEdit} record="capability" />
            {brief.length > 0 && (
              <details className="mt-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <summary className="cursor-pointer text-sm font-medium text-slate-800">
                  What buyers in your markets often ask for
                </summary>
                <ul className="mt-4 space-y-3">
                  {brief.map((item) => (
                    <li key={item.fieldName}>
                      <p className="text-sm font-medium text-slate-900">{item.fieldName}</p>
                      <p className="mt-1 text-sm leading-relaxed text-slate-600">{item.guidance}</p>
                    </li>
                  ))}
                </ul>
                {sampleLines.length > 0 && capabilities.length === 0 && (
                  <p className="mt-4 text-sm leading-relaxed text-slate-600">
                    Prompts, not records: {sampleLines.join(", ")}.
                  </p>
                )}
              </details>
            )}
            {canEdit && (
              <AddBlock label="Add a capability">
                <CapabilityForm lines={lines} />
              </AddBlock>
            )}
          </Panel>

          <Panel active={current.id === "projects"}>
            <SavedList rows={projects} canEdit={canEdit} record="project" />
            {canEdit && (
              <AddBlock label="Add a project">
                <SimpleRecordForm
                  kind="project"
                  title="Add a project"
                  fields={[
                    { name: "name", label: "Project name" },
                    { name: "client", label: "Client" },
                    { name: "country", label: "Country" },
                    { name: "role", label: "Your role" },
                    { name: "value", label: "Value" },
                    { name: "currency", label: "Currency" },
                    { name: "startDate", label: "Start", type: "date" },
                    { name: "endDate", label: "End", type: "date" },
                    { name: "scope", label: "Scope", type: "textarea" },
                  ]}
                />
              </AddBlock>
            )}
          </Panel>

          <Panel active={current.id === "people"}>
            <SavedList rows={personnel} canEdit={canEdit} record="personnel" />
            {canEdit && (
              <AddBlock label="Add a person">
                <SimpleRecordForm
                  kind="personnel"
                  title="Add a person"
                  fields={[
                    { name: "name", label: "Name" },
                    { name: "position", label: "Position" },
                    { name: "discipline", label: "Discipline" },
                    { name: "yearsExperience", label: "Years of experience", type: "number" },
                    { name: "certifications", label: "Certifications" },
                  ]}
                />
              </AddBlock>
            )}
          </Panel>

          <Panel active={current.id === "certificates"}>
            <SavedList rows={certifications} canEdit={canEdit} record="certification" />
            {canEdit && (
              <AddBlock label="Add a certificate">
                <SimpleRecordForm
                  kind="certification"
                  title="Add a certificate"
                  fields={[
                    { name: "name", label: "Name" },
                    { name: "issuer", label: "Issuer" },
                    { name: "expiresOn", label: "Expiry", type: "date" },
                  ]}
                />
              </AddBlock>
            )}
            <p className="mt-6 text-sm leading-relaxed text-slate-600">
              The file or the link that proves any of this lives on{" "}
              <Link href="/evidence" className="font-medium text-blue-700">
                Evidence
              </Link>
              .
            </p>
          </Panel>
        </div>

        <div className="mt-8 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
          <Button type="button" variant="outline" disabled={index === 0} onClick={() => go(index - 1)}>
            Back
          </Button>
          {index < steps.length - 1 ? (
            <Button type="button" onClick={() => go(index + 1)}>
              Continue
            </Button>
          ) : (
            <Button asChild>
              <Link href="/evidence">Continue to proof</Link>
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

function Panel({ active, children }: { active: boolean; children: ReactNode }) {
  return <div hidden={!active}>{children}</div>;
}

function SavedList({
  rows,
  canEdit,
  record,
}: {
  rows: Saved[];
  canEdit: boolean;
  record: "capability" | "project" | "personnel" | "certification";
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">Nothing saved here yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
      {rows.map((row) => (
        <li key={row.id} className="bg-slate-50 px-4 py-4">
          <p className="font-medium text-slate-900">{row.title}</p>
          <p className="mt-1 text-sm text-slate-600">{row.detail}</p>
          {canEdit && <VerifySelect record={record} id={row.id} value={row.verification} />}
        </li>
      ))}
    </ul>
  );
}

function AddBlock({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <Button type="button" variant="outline" className="mt-6" onClick={() => setOpen(true)}>
        {label}
      </Button>
    );
  }
  return (
    <div className="mt-2">
      {children}
      <button
        type="button"
        className="mt-4 text-sm text-slate-500 underline-offset-2 hover:underline"
        onClick={() => setOpen(false)}
      >
        Close this form
      </button>
    </div>
  );
}
