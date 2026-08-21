import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { loadEnv } from "@/lib/env";
import {
  getIngestBearerSecret,
  getIngestOpportunitiesUrl,
  ingestOpportunities,
  normalizeIngestBody,
} from "@/lib/ingest/opportunities";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function authorize(request: Request): boolean {
  const secret = getIngestBearerSecret();
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * n8n / external crawler ingest.
 *
 * Accepts either:
 * - n8n digest JSON: [{ total_jobs, jobs: [...] }]
 * - canonical: { orgSlug, source, items: [...] }
 *
 * Auth: Bearer INGEST_SECRET or SYNC_CRON_SECRET (machine secret, not user login).
 */
export async function POST(request: Request) {
  loadEnv();

  if (!authorize(request)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        hint: "Send Authorization: Bearer <INGEST_SECRET or SYNC_CRON_SECRET>",
      },
      { status: 401 },
    );
  }

  try {
    const json = await request.json();
    const url = new URL(request.url);
    const payload = normalizeIngestBody(json, {
      orgSlug: url.searchParams.get("orgSlug"),
    });
    const result = await ingestOpportunities(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: error.flatten(),
          acceptedShapes: [
            "[{ total_jobs, jobs: [...] }]  ← your current n8n Code node output",
            "{ jobs: [...] }",
            "{ orgSlug, source, items: [...] }",
          ],
          n8nHint: {
            method: "POST",
            url: `${getIngestOpportunitiesUrl()}?orgSlug=globecon`,
            header: "Authorization: Bearer <SYNC_CRON_SECRET>",
            body: "Send the previous node JSON as-is (JSON / raw)",
          },
        },
        { status: 400 },
      );
    }
    return handleApiError(error, "Ingest failed");
  }
}

/** Discovery helper for n8n setup — same Bearer required. */
export async function GET(request: Request) {
  loadEnv();

  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    method: "POST",
    url: `${getIngestOpportunitiesUrl()}?orgSlug=globecon`,
    auth: "Authorization: Bearer <INGEST_SECRET or SYNC_CRON_SECRET>",
    notes: [
      "You can POST your n8n jobs payload as-is: [{ total_jobs, jobs: [...] }].",
      "We map job_title/page_title, company, application_url/job_url, source, deadline_status.",
      "Set APP_URL on the host — this URL follows it.",
    ],
    fieldMap: {
      job_title_or_page_title: "title",
      company: "company (or parsed from page_title)",
      application_url_or_job_url: "url",
      source: "portal (BrighterMonday/FUZU/…)",
      job_type: "category",
      deadline: "deadline",
      deadline_status: "status",
    },
  });
}
