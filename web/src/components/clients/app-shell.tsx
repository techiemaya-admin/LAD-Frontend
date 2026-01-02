"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const onAuthPage = pathname === "/login";

  if (onAuthPage) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-6">
        <main className="w-full max-w-2xl">{children}</main>
      </div>
    );
  }

  // Check if we're on onboarding page - needs full screen
  const isOnboardingPage = pathname === "/onboarding";

  // Onboarding page needs full screen with sidebar
  if (isOnboardingPage) {
    return (
      <div className="flex h-screen bg-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden md:ml-16 h-full">
          <div className="w-full h-full">{children}</div>
        </main>
      </div>
    );
  }

  // Regular pages with padding and max-width
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden md:ml-16 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
