"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated by looking for access token
  useEffect(() => {
    const token = typeof document !== 'undefined' 
      ? document.cookie.includes('access_token')
      : false;
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  // Public pages that should not show the sidebar or app layout
  const isPublicPage = pathname === "/login" || 
                       pathname === "/register" || 
                       pathname === "/forgot-password" || 
                       pathname === "/pricing" ||
                       pathname === "/" ||
                       pathname === "/landing";
  
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

  // Don't show sidebar if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen w-full">
        <main className="w-full">{children}</main>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div>Loading...</div>
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
    <div className="flex min-h-screen bg-[#f2f7ff]">
      <Sidebar />
      <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden md:ml-16 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
