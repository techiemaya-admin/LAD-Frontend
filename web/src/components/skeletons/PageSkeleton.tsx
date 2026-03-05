"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export interface PageSkeletonProps {
  headerTitle?: boolean;
  headerBreadcrumb?: boolean;
  columns?: number;
  compact?: boolean;
}

export const PageSkeleton: React.FC<PageSkeletonProps> = ({
  headerTitle = true,
  headerBreadcrumb = true,
  columns = 1,
  compact = false,
}) => {
  return (
    <div className={`w-full ${compact ? 'p-4' : 'p-6 md:p-8'}`}>
      {/* Header Section */}
      <div className="mb-8 animate-pulse">
        {headerBreadcrumb && (
          <div className="flex gap-2 mb-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-4 w-24" />
          </div>
        )}
        {headerTitle && (
          <div className="space-y-2 mb-4">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        )}
      </div>

      {/* Content Grid */}
      <div className={`grid gap-6 ${columns === 1 ? 'grid-cols-1' : columns === 2 ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 lg:grid-cols-3'}`}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="space-y-4">
            {/* Card-like sections */}
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-3 p-4 rounded-lg border border-gray-200">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
