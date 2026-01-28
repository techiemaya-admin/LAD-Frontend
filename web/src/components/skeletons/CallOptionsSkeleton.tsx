"use client";

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const CallOptionsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
      </div>

      {/* Tabs/Mode Selection */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-32 rounded-md" />
        <Skeleton className="h-10 w-32 rounded-md" />
      </div>

      {/* Single Call Mode Content */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-28" />
        <div className="space-y-3">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      </div>

      {/* Data Source Selection */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 w-24 rounded-md" />
        </div>
      </div>

      {/* Additional Section */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-20 w-full rounded-md" />
      </div>
    </div>
  );
};
