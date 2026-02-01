


"use client";
import React from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  // Public pages (landing, login, pricing, etc.) get full width layout
  return (
    <div className="min-h-screen w-full bg-white">
      <Header />
      <main className="w-full mt-3">
        {children}
      </main>
      <Footer />
    </div>
  );
}