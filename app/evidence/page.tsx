import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";

import { DecisionPath } from "@/components/pis/decision-path";
import { DeleteEvidenceButton, EvidenceForm } from "@/components/pis/evidence-form";
import { EmptyState, PageShell, SectionCard, StatusPill } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  companyCapabilities,
  companyCertifications,
  companyPersonnel,
  companyProjects,
  evidenceDocuments,
} from "@/lib/db/schema";
import { formatDay, statusLabel } from "@/lib/pis/format";
import { redirectIfMarketsUnset } from "@/lib/pis/calibration";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  await redirectIfMarketsUnset(user.orgId);

  const [docs, capabilities, projects, personnel, certifications] = await Promise.all([
    db.select().from(evidenceDocuments).where(eq(evidenceDocuments.orgId, user.orgId)),
    db.select().from(companyCapabilities).where(eq(companyCapabilities.orgId, user.orgId)),
    db.select().from(companyProjects).where(eq(companyProjects.orgId, user.orgId)),
    db.select().from(companyPersonnel).where(eq(companyPersonnel.orgId, user.orgId)),
    db.select().from(companyCertifications).where(eq(companyCertifications.orgId, user.orgId)),
  ]);

  const visible =
    user.role === "viewer" ? docs.filter((doc) => doc.confidentiality === "internal") : docs;
  const today = new Date().toISOString().slice(0, 10);
  const soon = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const expiring = visible.filter(
    (doc) => doc.expiresOn && doc.expiresOn >= today && doc.expiresOn <= soon,
  );
  const related = [
    ...capabilities.map((row) => ({ value: `capability-${row.id}`, label: `Capability · ${row.name}` })),
    ...projects.map((row) => ({ value: `project-${row.id}`, label: `Project · ${row.name}` })),
    ...personnel.map((row) => ({ value: `person-${row.id}`, label: `Person · ${row.name}` })),
    ...certifications.map((row) => ({
      value: `certification-${row.id}`,
      label: `Certification · ${row.name}`,
    })),
  ];

  return (
    <PageShell
      title="Evidence"
      lede="Upload the certificate, or paste the link, that backs up what you wrote on Company. If the file is not here, a comparison says the proof is missing. That does not mean your firm cannot do the work. Viewers see Internal records only."
    >
      <DecisionPath current="/evidence" />
      <SectionCard title="Expiring within 30 days">
        {expiring.length === 0 ? (
          <p className="text-sm text-slate-600">Nothing in the vault expires in the next 30 days.</p>
        ) : (
          <ul className="space-y-3">
            {expiring.map((doc) => (
              <li key={doc.id} className="flex items-center justify-between gap-4 rounded-xl bg-amber-50 px-4 py-4">
                <span className="text-sm">{doc.name}</span>
                <StatusPill tone="missing">Expires {formatDay(doc.expiresOn)}</StatusPill>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Records">
        {visible.length === 0 ? (
          <EmptyState>No evidence records yet. Add a file or a link below.</EmptyState>
        ) : (
          <ul className="space-y-4">
            {visible.map((doc) => (
              <li key={doc.id} className="rounded-xl bg-slate-50 px-5 py-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-medium text-slate-900">{doc.name}</h3>
                  <StatusPill>{statusLabel(doc.confidentiality)}</StatusPill>
                  <StatusPill tone="calm">{statusLabel(doc.verificationStatus)}</StatusPill>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  {doc.documentType}
                  {doc.relatedLabel ? ` · ${doc.relatedLabel}` : ""}
                  {doc.expiresOn ? ` · expires ${formatDay(doc.expiresOn)}` : ""}
                  {doc.cloudinaryPublicId ? " · stored file" : doc.url ? " · link" : " · no file yet"}
                </p>
                {doc.notes && <p className="mt-2 text-sm text-slate-600">{doc.notes}</p>}
                <div className="mt-4 flex gap-4">
                  {doc.url && (
                    <a className="text-sm text-blue-700" href={doc.url}>
                      Open file
                    </a>
                  )}
                  {user.role !== "viewer" && <DeleteEvidenceButton id={doc.id} />}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {user.role !== "viewer" && (
        <SectionCard title="Add evidence" lede="Upload a file or paste a link. One is enough.">
          <EvidenceForm related={related} />
        </SectionCard>
      )}
    </PageShell>
  );
}
