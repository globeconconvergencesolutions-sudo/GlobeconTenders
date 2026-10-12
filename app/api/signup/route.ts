import { NextResponse } from "next/server";
import { z } from "zod";

import { handleApiError } from "@/lib/api/errors";
import { buildOrgLoginUrl, createOrganization } from "@/lib/platform/orgs";
import { listTemplateSummaries } from "@/lib/templates/load";
import { isApexHost } from "@/lib/tenant/resolution";

const signupSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/),
  templateId: z.string().min(1),
  adminName: z.string().min(2).max(120),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8).max(128),
});

export async function GET(request: Request) {
  const host = request.headers.get("host");
  if (!isApexHost(host)) {
    return NextResponse.json(
      { error: "Signup is only available on the platform host", code: "FORBIDDEN" },
      { status: 403 },
    );
  }

  return NextResponse.json({ templates: listTemplateSummaries() });
}

export async function POST(request: Request) {
  try {
    const host = request.headers.get("host");
    if (!isApexHost(host)) {
      return NextResponse.json(
        { error: "Signup is only available on the platform host", code: "FORBIDDEN" },
        { status: 403 },
      );
    }

    const payload = signupSchema.parse(await request.json());
    const result = await createOrganization({
      ...payload,
      selfServe: true,
    });

    return NextResponse.json(
      {
        organization: {
          id: result.org.id,
          name: result.org.name,
          slug: result.org.slug,
          plan: result.org.plan,
          trialEndsAt: result.org.trialEndsAt?.toISOString() ?? null,
        },
        loginUrl: buildOrgLoginUrl(result.org.slug),
      },
      { status: 201 },
    );
  } catch (error) {
    return handleApiError(error, "Signup failed");
  }
}
