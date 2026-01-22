"use client";
import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
export default function SkeletonPage() {
  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top search/filters row */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-64 rounded-full" />
          <Skeleton className="h-10 w-40 rounded-full" />
          <div className="flex-1" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
        {/* Large primary card */}
        <div className="rounded-3xl p-6 bg-transparent">
          <div className="space-y-3 mb-6">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <Skeleton className="h-56 w-full rounded-2xl" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
        </div>
        {/* List rows (example) */}
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}