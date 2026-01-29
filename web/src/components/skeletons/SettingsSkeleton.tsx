"use client";

import React from 'react';

/**
 * Skeleton loader for Settings
 */
export function SettingsSkeleton() {
  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-8">
        <div className="h-8 w-40 skeleton rounded mb-2" />
        <div className="h-4 w-72 skeleton rounded" />
      </div>

      {/* Settings Tabs/Navigation */}
      <div className="flex gap-4 mb-6 border-b border-gray-200 pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-5 w-24 skeleton rounded" />
        ))}
      </div>

      {/* Settings Form */}
      <div className="space-y-6">
        {Array.from({ length: 4 }).map((_, sectionIndex) => (
          <div key={sectionIndex} className="bg-white p-6 rounded-lg border border-gray-200">
            {/* Section Title */}
            <div className="h-6 w-32 skeleton rounded mb-4" />

            {/* Form Fields */}
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, fieldIndex) => (
                <div key={fieldIndex} className="space-y-2">
                  <div className="h-4 w-24 skeleton rounded" />
                  <div className="h-10 w-full skeleton rounded-lg" />
                </div>
              ))}
            </div>

            {/* Button */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
              <div className="h-10 w-24 skeleton rounded-lg" />
              <div className="h-10 w-24 skeleton rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SettingsSkeleton;
