"use client";
import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  // Whether the user has pinned the sidebar open. Controls the main-content
  // left-margin so a permanently expanded sidebar doesn't overlap the page.
  const [sidebarPinned, setSidebarPinned] = useState(false);

  // Check if user is authenticated by looking for access token
  useEffect(() => {
    const token =
      typeof document !== "undefined"
        ? document.cookie.includes("access_token")
        : false;
    setIsAuthenticated(!!token);
    setIsLoading(false);
  }, []);

  // Mirror the sidebar pin state — listen for the same custom event the
  // sidebar dispatches on toggle, AND read the saved preference on mount.
  useEffect(() => {
    try {
      setSidebarPinned(window.localStorage.getItem('sidebar.pinned') === '1');
    } catch { /* localStorage blocked */ }
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSidebarPinned(!!detail?.pinned);
    };
    window.addEventListener('sidebar:pinned-changed', onChange);
    return () => window.removeEventListener('sidebar:pinned-changed', onChange);
  }, []);

  // Reusable margin class — `ml-64` (256px) when pinned, otherwise the
  // narrow 16px rail (`ml-16`). The sidebar still overlays the page on
  // hover-expand (unpinned), which keeps the existing UX intact.
  const sidebarMargin = sidebarPinned ? 'md:ml-64' : 'md:ml-16';

  // Public pages that should not show the sidebar or app layout
  const isPublicPage =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/pricing" ||
    pathname === "/" ||
    pathname === "/landing";

  const onOnboardingPage = pathname === "/onboarding";
  const onCampaignsPage =
    pathname === "/campaigns" || pathname.startsWith("/campaigns/");

  // Render public pages without sidebar or app shell
  if (isPublicPage) {
    return (
      <div className="min-h-screen w-full">
         {/* <Sidebar /> */}
        <main className="w-full">{children}</main>
      </div>
    );
  }

  // Don't show sidebar if not authenticated
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen w-full">
         {/* <Sidebar /> */}
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
        {/* <Sidebar /> */}
        <main className={`flex-1 overflow-hidden ml-0 ${sidebarMargin} pt-14 md:pt-0 transition-[margin] duration-500 ease-[cubic-bezier(.4,0,.2,1)]`}>
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f2f7ff]">
      {/* <Sidebar /> */}
      <main className={`flex-1 p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 overflow-x-hidden ${sidebarMargin} pt-14 md:pt-0 transition-[margin] duration-500 ease-[cubic-bezier(.4,0,.2,1)]`}>
        <div className="max-w-7xl mx-auto w-full">{children}</div>
      </main>
    </div>
  );
}
