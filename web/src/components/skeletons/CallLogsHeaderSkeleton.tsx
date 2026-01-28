"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const CallLogsHeaderSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Title Section */}
      <div className="space-y-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Filters Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Date Filter */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Time Filter */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Provider Filter */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      {/* Action Buttons Section */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>
    </div>
  );
};
