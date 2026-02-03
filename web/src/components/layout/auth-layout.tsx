"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";
import { Sidebar } from "../sidebar";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Public pages (landing, login, pricing, etc.) get full width layout
  return (
    <div className="flex h-screen bg-white">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden ml-0 md:ml-16 pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
