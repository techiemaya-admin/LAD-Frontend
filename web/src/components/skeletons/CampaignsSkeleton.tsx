"use client";

import React from 'react';

/**
 * Skeleton loader for Campaigns
 */
export function CampaignsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <div className="h-8 w-48 skeleton rounded mb-2" />
          <div className="h-4 w-64 skeleton rounded" />
        </div>
        <div className="h-10 w-40 skeleton rounded-lg" />
      </div>

      {/* Filters/Search */}
      <div className="flex gap-3">
        <div className="flex-1 h-10 skeleton rounded-lg" />
        <div className="h-10 w-32 skeleton rounded-lg" />
        <div className="h-10 w-32 skeleton rounded-lg" />
      </div>

      {/* Campaigns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition">
            {/* Card Image */}
            <div className="h-40 w-full skeleton" />

            {/* Card Content */}
            <div className="p-4 space-y-3">
              <div className="h-5 w-32 skeleton rounded" />
              <div className="h-3 w-full skeleton rounded" />
              <div className="h-3 w-24 skeleton rounded" />

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-gray-200">
                <div>
                  <div className="h-3 w-16 skeleton rounded mb-1" />
                  <div className="h-4 w-20 skeleton rounded" />
                </div>
                <div>
                  <div className="h-3 w-16 skeleton rounded mb-1" />
                  <div className="h-4 w-20 skeleton rounded" />
                </div>
              </div>

              {/* Action Button */}
              <div className="h-9 w-full skeleton rounded-lg pt-2" />
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-8 w-8 skeleton rounded" />
        ))}
      </div>
    </div>
  );
}

export default CampaignsSkeleton;
