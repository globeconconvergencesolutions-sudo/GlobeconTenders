import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { auth } from "@/auth";
import { SignOutOverlay } from "@/components/auth/sign-out-overlay";
import { OrgThemeStyles } from "@/components/branding/org-theme-styles";
import { AppShellGate } from "@/components/layout/app-shell-gate";
import { Toaster } from "@/components/ui/sonner";
import { OrgContextProvider } from "@/components/providers/org-context-provider";
import { AuthSessionProvider } from "@/components/providers/session-provider";
import { NavAccessProvider } from "@/components/providers/nav-access-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { BRAND_ASSETS } from "@/lib/brand";
import { buildNavAccess } from "@/lib/auth/nav-access";
import { getOrgContext } from "@/lib/tenant/org-context";
import { PLATFORM_PRODUCT_NAME } from "@/lib/tenant/config";

import "./globals.css";

export const dynamic = "force-dynamic";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  const org = await getOrgContext();
  const title = `${org.branding.displayName} ${org.branding.productTagline}`;

  return {
    metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
    title: {
      default: title,
      template: `%s | ${title}`,
    },
    description: `Track and match ${org.lexicon.opportunityPlural.toLowerCase()} for ${org.branding.displayName}`,
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
      title,
      description: `${PLATFORM_PRODUCT_NAME} — ${org.branding.displayName}`,
      images: [{ url: BRAND_ASSETS.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      images: [BRAND_ASSETS.ogImage],
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const orgContext = await getOrgContext();
  const session = await auth();
  const navAccess = buildNavAccess(session);

  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.variable} min-h-full font-sans antialiased`}>
        <OrgThemeStyles branding={orgContext.branding} />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          disableTransitionOnChange
        >
          <AuthSessionProvider session={session}>
            <NavAccessProvider value={navAccess}>
              <OrgContextProvider value={orgContext}>
                <SignOutOverlay />
                <AppShellGate isAuthenticated={Boolean(session?.user)}>
                  {children}
                </AppShellGate>
                <Toaster richColors closeButton position="top-right" />
              </OrgContextProvider>
            </NavAccessProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
