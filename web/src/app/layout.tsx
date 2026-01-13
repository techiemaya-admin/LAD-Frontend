import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppShell from "@/components/clients/app-shell";
import { AppToasterProvider } from "@/components/ui/app-toaster";
import { LoadingProvider } from "@/components/providers/loading-provider";
import ContentGate from "@/components/clients/content-gate";
import Providers from "./providers";
// Import VAPI error suppression (temporarily disable VAPI errors)
import "@/utils/suppressVAPIErrors";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LAD",
  description: "LAD - AI-Powered Sales Platform",
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
        <html lang="en" suppressHydrationWarning>
      <head>
              <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600&family=Orbitron:wght@500;700&family=Share+Tech+Mono&display=swap"
          rel="stylesheet"
        />
      </head>

      <body className={`antialiased`}>
        <Providers>
          <AppToasterProvider>
            <LoadingProvider>
              <AppShell>
                <ContentGate>
                  {children}
                </ContentGate>
              </AppShell>
            </LoadingProvider>
          </AppToasterProvider>
        </Providers>
      </body>
    </html>
  );
}

