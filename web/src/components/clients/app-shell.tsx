"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
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
      <div className="min-h-screen w-full">
        <main className="w-full">{children}</main>
      </div>
    );
  }
  // Full screen pages without padding/margins (onboarding, campaigns)
  if (onOnboardingPage || onCampaignsPage) {
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden ml-0 md:ml-16 pt-14 md:pt-0">
          {children}
        </main>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden md:ml-16 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
