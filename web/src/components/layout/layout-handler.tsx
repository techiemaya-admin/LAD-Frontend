"use client";
import React from "react";
import { usePathname } from "next/navigation";
import PublicLayout from "./public-layout";
import AuthLayout from "./auth-layout";
import { isOpenRoute } from "@/lib/routes";

export default function LayoutHandler({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  // Define public/API routes that don't require authentication
  const isPublicRoute = isOpenRoute(pathname) ||
    pathname.startsWith("/api/");

  // Use public layout for public routes, auth layout for protected routes
  if (isPublicRoute ) {
    return <PublicLayout>{children}</PublicLayout>;
  }

  return <AuthLayout>{children}</AuthLayout>;
}