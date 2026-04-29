import type { Metadata } from "next";
import "./globals.css";
import { AppToasterProvider } from "@/components/ui/app-toaster";
import { LoadingProvider } from "@/components/providers/loading-provider";
import Providers from "./providers";
import LayoutHandler from "@/components/layout/layout-handler";
import ContactFormModal from "@/components/ContactFormModal";
// Import VAPI error suppression (temporarily disable VAPI errors)
import "@/utils/suppressVAPIErrors";

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
        {/* Favicon */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/favicon.svg" />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize theme from localStorage or system preference
              (function() {
                try {
                  const theme = localStorage.getItem('theme');
                  const isDark = theme === 'dark' || (theme === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
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
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@400;600&family=Orbitron:wght@500;700&family=Share+Tech+Mono&display=swap"
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
