import { readFileSync } from "node:fs";
import { join } from "node:path";

import type { PlatformTemplate } from "./types";

const TEMPLATE_IDS = ["procurement", "hr"] as const;
/** Offered at signup and in settings. HR careers is not a second product. */
const OFFERED_TEMPLATE_IDS = ["procurement"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function isKnownTemplateId(id: string): id is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(id);
}

export function loadTemplate(templateId: string): PlatformTemplate {
  const id = isKnownTemplateId(templateId) ? templateId : "procurement";
  const filePath = join(process.cwd(), "templates", `${id}.json`);
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as PlatformTemplate;
}

export function listTemplateSummaries() {
  return OFFERED_TEMPLATE_IDS.map((id) => {
    const template = loadTemplate(id);
    return {
      id: template.id,
      version: template.version,
      name: template.name,
      description: template.description,
    };
  });
}
