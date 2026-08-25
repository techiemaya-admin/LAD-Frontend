import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AppToasterProvider } from "@/components/ui/app-toaster";
import { LoadingProvider } from "@/components/providers/loading-provider";
import Providers from "./providers";
import LayoutHandler from "@/components/layout/layout-handler";
import ContactFormModal from "@/components/ContactFormModal";
// Import VAPI error suppression (temporarily disable VAPI errors)
import "@/utils/suppressVAPIErrors";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.mrlads.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Mr LAD - AI-Powered Sales Platform",
    template: "%s · Mr LAD",
  },
  description:
    "Mr LAD is one AI Sales Employee who finds your ideal customers, starts real conversations, follows up, and books meetings across LinkedIn, WhatsApp, Instagram, email, and voice.",
  applicationName: "Mr LAD",
  openGraph: {
    type: "website",
    siteName: "Mr LAD",
    title: "Mr LAD - AI-Powered Sales Platform",
    description:
      "One AI Sales Employee across LinkedIn, WhatsApp, Instagram, email, and voice. The output of an entire sales team.",
    url: SITE_URL,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Mr LAD" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Mr LAD - AI-Powered Sales Platform",
    description:
      "One AI Sales Employee across LinkedIn, WhatsApp, Instagram, email, and voice.",
    images: ["/og-image.png"],
  },
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
        {/* Favicon - MrLAD square mark */}
        <link rel="icon" href="/MrLad-code.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/MrLad-code.svg" />
        
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize theme from localStorage or system preference
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const isDark = theme === 'dark' || ((theme === null || theme === 'system') && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch(e) {
                  // Fallback to system preference
                  if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                  }
                }
              })();
              // Suppress Chrome extension message passing errors immediately
              window.addEventListener('error', function(event) {
                if (event.message && event.message.includes('A listener indicated an asynchronous response')) {
                  event.preventDefault();
                  return true;
                }
              });
              window.addEventListener('unhandledrejection', function(event) {
                if (event.reason && event.reason.toString && event.reason.toString().includes('A listener indicated an asynchronous response')) {
                  event.preventDefault();
                }
              });
            `,
          }}
        />
        {/* Load the fonts the design actually uses (Inter for body, Space
            Grotesk for headings - see globals.css). Preconnect first so the
            font CSS + files aren't gated behind a cold cross-origin handshake. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`antialiased`}>
        <Providers>
          <LoadingProvider>
            <AppToasterProvider>
              {/* <PageLoader /> */}
              <LayoutHandler>
                {children}
              </LayoutHandler>
              {/* Contact Form Modal - Available globally */}
              <ContactFormModal />
            </AppToasterProvider>
          </LoadingProvider>
        </Providers>
      </body>
    </html>
  );
}
