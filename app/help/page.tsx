import { HelpCenter } from "@/components/pis/help-center";

export const dynamic = "force-dynamic";

export default async function HelpPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const params = await searchParams;
  return <HelpCenter initialSection={params.section} />;
}
