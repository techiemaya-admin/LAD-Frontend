"use client";
import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import PageLoader from "@/components/loader/PageLoader";
import { loadingBus } from "@/lib/loading-bus";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [prevPath, setPrevPath] = useState(pathname);

  // Trigger global loader on navigation to cover compilation/fetching time
  useEffect(() => {
    if (pathname !== prevPath) {
      // Force a minimum visible time for the transition
      const hideAt = loadingBus.requestStart(800);
      setPrevPath(pathname);

      // Signal completion; the bus will keep it visible until hideAt
      loadingBus.requestEnd(hideAt);
    }
  }, [pathname, prevPath]);

  // Public pages that should not show the sidebar or app layout
  const isPublicPage = pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/pricing";
  const onOnboardingPage = pathname === "/onboarding";
  const onCampaignsPage = pathname === "/campaigns" || pathname.startsWith("/campaigns/");
  // Render public pages without sidebar or app shell
  if (isPublicPage) {
    return (
      <div className="min-h-screen w-full relative">
        {/* <PageLoader /> */}
        <main className="w-full">{children}</main>
      </div>
    );
  }
  // Full screen pages without padding/margins (onboarding, campaigns)
  if (onOnboardingPage || onCampaignsPage) {
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden ml-0 md:ml-16 pt-14 md:pt-0 relative h-screen">
          {/* <PageLoader /> */}
          {children}
        </main>
      </div>
    );
  }
  return (
    <div className="flex h-screen bg-[#f2f7ff] overflow-hidden">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-y-auto overflow-x-hidden md:ml-16 pt-14 md:pt-0 relative h-screen">
        {/* <PageLoader /> */}
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
