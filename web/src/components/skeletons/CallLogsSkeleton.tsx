"use client";

import React from 'react';

/**
 * Skeleton loader for Call Logs
 */
export function CallLogsSkeleton() {
  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 w-48 skeleton rounded mb-2" />
        <div className="h-4 w-64 skeleton rounded" />
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6">
        <div className="h-10 w-40 skeleton rounded-lg" />
        <div className="h-10 w-32 skeleton rounded-lg" />
        <div className="h-10 w-32 skeleton rounded-lg" />
      </div>

      {/* Table Header */}
      <div className="bg-gray-50 rounded-t-lg p-4 flex gap-4 items-center">
        <div className="h-4 w-4 skeleton rounded" />
        <div className="h-4 w-32 skeleton rounded flex-1" />
        <div className="h-4 w-24 skeleton rounded" />
        <div className="h-4 w-24 skeleton rounded" />
        <div className="h-4 w-20 skeleton rounded" />
      </div>

      {/* Table Rows */}
      <div className="border border-gray-200 rounded-b-lg overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 items-center p-4 border-b border-gray-100 last:border-0 hover:bg-gray-50"
          >
            <div className="h-4 w-4 skeleton rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 skeleton rounded" />
              <div className="h-3 w-48 skeleton rounded" />
            </div>
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-6 w-16 skeleton rounded-full" />
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-6">
        <div className="h-4 w-32 skeleton rounded" />
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-8 skeleton rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default CallLogsSkeleton;
