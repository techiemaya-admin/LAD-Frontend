"use client";

import React from 'react';

/**
 * Skeleton loader for Team Management
 * Displays a loading placeholder that matches the team management table layout
 */
export function TeamManagementSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 bg-gray-200 dark:bg-slate-800 animate-pulse rounded mb-2" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />
        </div>
        <div className="h-10 w-40 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-lg" />
      </div>

      {/* Table Skeleton */}
      <div className="bg-white dark:bg-[#071131] rounded-2xl shadow-sm border border-gray-200 dark:border-blue-950/40 overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-50 dark:bg-[#0b1739]/60 border-b border-gray-200 dark:border-blue-950/40">
          <div className="flex px-6 py-4 gap-4">
            <div className="h-4 w-24 bg-gray-200 dark:bg-slate-800 animate-pulse rounded flex-[1.5]" />
            <div className="h-4 w-32 bg-gray-200 dark:bg-slate-800 animate-pulse rounded flex-[2]" />
            <div className="h-4 w-20 bg-gray-200 dark:bg-slate-800 animate-pulse rounded flex-1" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-slate-800 animate-pulse rounded flex-1" />
            <div className="h-4 w-24 bg-gray-200 dark:bg-slate-800 animate-pulse rounded flex-[1.5]" />
            <div className="h-4 w-16 bg-gray-200 dark:bg-slate-800 animate-pulse rounded flex-1" />
          </div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-gray-200 dark:divide-blue-950/30">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex px-6 py-4 gap-4 items-center"
            >
              <div className="flex-[1.5] space-y-2">
                <div className="h-4 w-32 bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />
              </div>
              <div className="flex-[2] space-y-2">
                <div className="h-4 w-40 bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />
              </div>
              <div className="flex-1">
                <div className="h-8 w-24 bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />
              </div>
              <div className="flex-1">
                <div className="h-6 w-16 bg-gray-200 dark:bg-slate-800 animate-pulse rounded-full" />
              </div>
              <div className="flex-[1.5] space-y-2">
                <div className="h-3 w-full bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />
                <div className="h-3 w-4/5 bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />
              </div>
              <div className="flex-1">
                <div className="h-8 w-8 bg-gray-200 dark:bg-slate-800 animate-pulse rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TeamManagementSkeleton;
