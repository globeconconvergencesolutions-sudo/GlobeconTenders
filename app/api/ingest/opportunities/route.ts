import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { loadEnv } from "@/lib/env";
import {
  getIngestBearerSecret,
  getIngestOpportunitiesUrl,
  ingestOpportunities,
  ingestPayloadSchema,
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
 * POST JSON opportunities → upsert into the target org dashboard.
 * URL is always derived from APP_URL (change host in env, not in code).
 *
 * Auth: Bearer token (INGEST_SECRET or SYNC_CRON_SECRET).
 * This is machine-to-machine protection — not a user login.
 * Leaving it open would let anyone spam fake jobs into your DB.
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
    const payload = ingestPayloadSchema.parse(json);
    const result = await ingestOpportunities(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid payload",
          details: error.flatten(),
          example: {
            orgSlug: "globecon",
            source: { slug: "n8n-hr-jobs", name: "N8N HR Job Feed" },
            items: [
              {
                title: "HUMAN RESOURCE OFFICER",
                company: "Example Ltd",
                deadline: "2026-08-30",
                url: "https://www.brightermonday.co.ke/listings/example",
                portal: "BrighterMonday",
                status: "OPEN",
                countryLabel: "Kenya",
              },
            ],
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
    url: getIngestOpportunitiesUrl(),
    auth: "Authorization: Bearer <INGEST_SECRET or SYNC_CRON_SECRET>",
    notes: [
      "Set APP_URL on the host (e.g. https://gcstendersvic.netlify.app) — this URL follows it.",
      "Send JSON body with items[]. Upserts by source + referenceId/url.",
      "No user login required — only the shared machine secret.",
    ],
    body: {
      orgSlug: "globecon",
      source: { slug: "n8n-hr-jobs", name: "N8N HR Job Feed" },
      items: [
        {
          title: "string (required)",
          company: "string",
          deadline: "YYYY-MM-DD or null/NO DEADLINE",
          url: "https://...",
          portal: "BrighterMonday | MyJobMag | FUZU",
          status: "OPEN",
          category: "Human Resources",
          countryLabel: "Kenya",
          regionLabel: "East Africa",
          referenceId: "optional-stable-id",
        },
      ],
    },
  });
}
