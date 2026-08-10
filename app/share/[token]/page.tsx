import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicTenderViewPanel } from "@/components/share/public-tender-view";
import {
  getOrgContextByOrgId,
  toSharePresentation,
} from "@/lib/tenant/org-context";
import { getPublicTenderByShareToken } from "@/lib/tenders/share";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const tender = await getPublicTenderByShareToken(token);
  if (!tender) {
    return { title: "Shared opportunity" };
  }

  const presentation = toSharePresentation(
    await getOrgContextByOrgId(tender.orgId),
  );

  return {
    robots: { index: false, follow: false },
    title: tender.title,
    description: `Shared ${presentation.lexicon.opportunity.toLowerCase()} from ${presentation.organizationName}`,
  };
}

export default async function ShareTenderPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const tender = await getPublicTenderByShareToken(token);

  if (!tender) {
    notFound();
  }

  const presentation = toSharePresentation(
    await getOrgContextByOrgId(tender.orgId),
  );

  return (
    <PublicTenderViewPanel tender={tender} presentation={presentation} />
  );
}
