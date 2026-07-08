import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicTenderViewPanel } from "@/components/share/public-tender-view";
import { BRAND } from "@/lib/brand";
import { getPublicTenderByShareToken } from "@/lib/tenders/share";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Shared tender",
  description: `A procurement opportunity shared from ${BRAND.fullName}`,
};

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

  return <PublicTenderViewPanel tender={tender} />;
}
