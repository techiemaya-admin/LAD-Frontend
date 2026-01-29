"use client";

import React from 'react';

/**
 * Skeleton loader for Pipeline Board
 * Displays a loading placeholder that matches the pipeline layout
 */
export function PipelineSkeleton() {
  return (
    <div className="p-4">
      {/* Header Skeleton */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-8 w-8 rounded-full skeleton" />
          <div className="flex-1">
            <div className="h-8 w-48 skeleton rounded mb-2" />
            <div className="h-4 w-72 skeleton rounded" />
          </div>
        </div>
      </div>

      {/* Toolbar Skeleton */}
      <div className="mb-4 flex gap-2">
        <div className="h-10 w-40 skeleton rounded-lg" />
        <div className="h-10 w-32 skeleton rounded-lg" />
        <div className="h-10 w-32 skeleton rounded-lg" />
        <div className="ml-auto h-10 w-24 skeleton rounded-lg" />
      </div>

      {/* Kanban Board Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 overflow-x-auto">
        {Array.from({ length: 4 }).map((_, colIndex) => (
          <div key={colIndex} className="min-w-80 flex flex-col gap-4">
            {/* Column Header */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="h-5 w-24 skeleton rounded" />
              <div className="h-5 w-8 skeleton rounded" />
            </div>

            {/* Cards */}
            {Array.from({ length: 3 }).map((_, cardIndex) => (
              <div key={cardIndex} className="p-4 bg-white border border-gray-200 rounded-lg space-y-3">
                <div className="h-4 w-32 skeleton rounded" />
                <div className="h-3 w-full skeleton rounded" />
                <div className="h-3 w-24 skeleton rounded" />
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-12 skeleton rounded-full" />
                  <div className="h-6 w-12 skeleton rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PipelineSkeleton;
