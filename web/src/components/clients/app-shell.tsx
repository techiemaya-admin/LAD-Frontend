"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { TopHeader } from "@/components/TopHeader";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onAuthPage = pathname === "/login";
  const onOnboardingPage = pathname === "/onboarding";
  const onCampaignsPage = pathname === "/campaigns" || pathname.startsWith("/campaigns/");
  const onConversationsPage = pathname === "/conversations" || pathname.startsWith("/conversations/");
  const onPipelinePage = pathname === "/pipeline" || pathname.startsWith("/pipeline/");

  if (onAuthPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6">
        <main className="w-full max-w-2xl">{children}</main>
      </div>
    );
  }

  // Conversations page - no top header
  if (onConversationsPage) {
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden ml-0 md:ml-16">
          {children}
        </main>
      </div>
    );
  }

  // Full screen pages without padding/margins (onboarding, campaigns, pipeline)
  if (onOnboardingPage || onCampaignsPage || onPipelinePage) {
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden ml-0 md:ml-16">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden md:ml-16">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
