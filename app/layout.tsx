import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { AppShell } from "@/components/layout/app-shell";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { BRAND, BRAND_ASSETS } from "@/lib/brand";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  title: {
    default: BRAND.fullName,
    template: `%s | ${BRAND.fullName}`,
  },
  description: "Track and match procurement tenders for Globecon service lines",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: BRAND_ASSETS.icon32, sizes: "32x32", type: "image/png" },
      { url: BRAND_ASSETS.icon16, sizes: "16x16", type: "image/png" },
    ],
    apple: [{ url: BRAND_ASSETS.appleTouchIcon, sizes: "180x180" }],
    shortcut: BRAND_ASSETS.favicon,
  },
  openGraph: {
    title: BRAND.fullName,
    description: "Track and match procurement tenders for Globecon service lines",
    images: [{ url: BRAND_ASSETS.ogImage, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: BRAND.fullName,
    images: [BRAND_ASSETS.ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.variable} min-h-full font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthSessionProvider>
            <AppShell>{children}</AppShell>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
