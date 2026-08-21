/**
 * One-shot: switch an org to a vertical template (default globecon → hr).
 *
 * Usage:
 *   pnpm tsx scripts/switch-org-template.ts
 *   pnpm tsx scripts/switch-org-template.ts acme hr
 *   pnpm tsx scripts/switch-org-template.ts globecon procurement
 */
import { eq } from "drizzle-orm";

import { loadEnv } from "../lib/env";
import { getDb } from "../lib/db";
import { organizations } from "../lib/db/schema";
import { switchOrgTemplate } from "../lib/templates/apply";
import { isKnownTemplateId } from "../lib/templates/load";

async function main() {
  loadEnv();
  const orgSlug = (process.argv[2] ?? "globecon").trim().toLowerCase();
  const templateId = (process.argv[3] ?? "hr").trim().toLowerCase();

  if (!isKnownTemplateId(templateId)) {
    throw new Error(`Unknown template "${templateId}". Use procurement or hr.`);
  }

  const db = getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");

  const [org] = await db
    .select({ id: organizations.id, slug: organizations.slug, templateId: organizations.templateId })
    .from(organizations)
    .where(eq(organizations.slug, orgSlug))
    .limit(1);

  if (!org) throw new Error(`Organization "${orgSlug}" not found`);

  const result = await switchOrgTemplate({
    orgId: org.id,
    templateId,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        orgSlug: org.slug,
        ...result,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
