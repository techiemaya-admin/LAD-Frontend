"use client";

import React from 'react';

/**
 * Skeleton loader for Dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-48 skeleton rounded mb-2" />
        <div className="h-4 w-64 skeleton rounded" />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-4 bg-white rounded-lg border border-gray-200">
            <div className="h-4 w-20 skeleton rounded mb-3" />
            <div className="h-8 w-32 skeleton rounded mb-2" />
            <div className="h-3 w-24 skeleton rounded" />
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="p-6 bg-white rounded-lg border border-gray-200">
            <div className="h-5 w-32 skeleton rounded mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, j) => (
                <div key={j} className="flex items-center gap-3">
                  <div className="h-3 w-20 skeleton rounded" />
                  <div className="flex-1 h-6 skeleton rounded" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Table Section */}
      <div className="p-6 bg-white rounded-lg border border-gray-200">
        <div className="h-5 w-32 skeleton rounded mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3 border-b border-gray-100 last:border-0">
              <div className="h-4 w-4 skeleton rounded" />
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-4 w-24 skeleton rounded" />
              <div className="h-4 w-20 skeleton rounded" />
              <div className="h-4 w-16 skeleton rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardSkeleton;
