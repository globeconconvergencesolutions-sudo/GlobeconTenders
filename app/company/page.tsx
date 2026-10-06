import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";

import { CompanyDesk } from "@/components/pis/company-desk";
import { DecisionPath } from "@/components/pis/decision-path";
import { PageShell } from "@/components/pis/shell";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  catalogServiceLines,
  companyCapabilities,
  companyCertifications,
  companyPersonnel,
  companyProfiles,
  companyProjects,
  evidenceDocuments,
  marketFields,
} from "@/lib/db/schema";
import { verificationLabel } from "@/lib/pis/format";
import { loadMarketBrief, redirectIfMarketsUnset } from "@/lib/pis/calibration";
import { getOrgContext } from "@/lib/tenant/org-context";

export const dynamic = "force-dynamic";

export default async function CompanyPage() {
  const org = await getOrgContext();
  if (!org.features.pis) redirect("/");
  const user = await getSessionUser();
  const db = getDb();
  if (!db || !user?.orgId) redirect("/login");
  const orgId = user.orgId;
  await redirectIfMarketsUnset(orgId);

  const [profile] = await db
    .select()
    .from(companyProfiles)
    .where(eq(companyProfiles.orgId, orgId))
    .limit(1);
  const [capabilities, projects, personnel, certifications, evidence, lines, brief] =
    await Promise.all([
      db.select().from(companyCapabilities).where(eq(companyCapabilities.orgId, orgId)),
      db.select().from(companyProjects).where(eq(companyProjects.orgId, orgId)),
      db.select().from(companyPersonnel).where(eq(companyPersonnel.orgId, orgId)),
      db.select().from(companyCertifications).where(eq(companyCertifications.orgId, orgId)),
      db.select().from(evidenceDocuments).where(eq(evidenceDocuments.orgId, orgId)),
      db
        .select({
          id: catalogServiceLines.id,
          name: catalogServiceLines.name,
          fieldName: marketFields.name,
        })
        .from(catalogServiceLines)
        .innerJoin(marketFields, eq(marketFields.id, catalogServiceLines.marketFieldId))
        .orderBy(asc(marketFields.sortOrder), asc(catalogServiceLines.name)),
      loadMarketBrief(db, orgId),
    ]);

  return (
    <PageShell
      title="Company"
      lede="When a tender asks for your experience, people, or a certificate, this is the page it is compared with. One step at a time. You can leave a step empty and come back."
    >
      <DecisionPath current="/company" />
      <CompanyDesk
        canEdit={user.role !== "viewer"}
        profile={
          profile
            ? {
                legalName: profile.legalName,
                registrationNumber: profile.registrationNumber,
                country: profile.country,
                locations: profile.locations,
                yearsOperating: profile.yearsOperating,
                description: profile.description,
                website: profile.website,
                contacts: profile.contacts,
              }
            : null
        }
        lines={lines}
        brief={brief.map((item) => ({ fieldName: item.fieldName, guidance: item.guidance }))}
        sampleLines={brief.flatMap((item) => item.sampleLines).slice(0, 6)}
        capabilities={capabilities.map((row) => ({
          id: row.id,
          title: row.name,
          detail: row.description?.trim() || verificationLabel(row.verificationStatus),
          verification: row.verificationStatus,
        }))}
        projects={projects.map((row) => ({
          id: row.id,
          title: row.name,
          detail: `${row.client ?? "Client unknown"} · ${row.country ?? "Country unknown"}`,
          verification: row.verificationStatus,
        }))}
        personnel={personnel.map((row) => ({
          id: row.id,
          title: row.name,
          detail: `${row.position ?? "Role unknown"}${row.yearsExperience != null ? ` · ${row.yearsExperience} years` : ""}`,
          verification: row.verificationStatus,
        }))}
        certifications={certifications.map((row) => ({
          id: row.id,
          title: row.name,
          detail: `${row.issuer ?? "Issuer unknown"} · expires ${row.expiresOn ?? "unknown"}`,
          verification: row.verificationStatus,
        }))}
        evidenceCount={evidence.length}
      />
    </PageShell>
  );
}
