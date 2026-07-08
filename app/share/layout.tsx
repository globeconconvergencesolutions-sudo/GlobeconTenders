import type { Metadata } from "next";

import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Shared tender",
  description: `Read-only tender preview from ${BRAND.fullName}`,
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
