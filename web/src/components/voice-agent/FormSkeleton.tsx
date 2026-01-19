import React from 'react';

export function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 w-48 skeleton rounded-lg" />
          <div className="h-4 w-32 skeleton rounded mt-2" />
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-24 skeleton rounded-lg" />
          <div className="h-10 w-32 skeleton rounded-lg" />
        </div>
      </div>

      {/* Basic Details section */}
      <div className="form-section space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 skeleton rounded-xl" />
          <div>
            <div className="h-5 w-32 skeleton rounded" />
            <div className="h-3 w-48 skeleton rounded mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <div className="h-4 w-20 skeleton rounded" />
            <div className="h-10 skeleton rounded-lg" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 skeleton rounded" />
            <div className="h-10 skeleton rounded-lg" />
          </div>
        </div>
      </div>

      {/* Voice & Language section */}
      <div className="form-section space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 skeleton rounded-xl" />
          <div>
            <div className="h-5 w-40 skeleton rounded" />
            <div className="h-3 w-56 skeleton rounded mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="space-y-2">
            <div className="h-4 w-24 skeleton rounded" />
            <div className="h-10 skeleton rounded-lg" />
          </div>
          <div className="h-10 w-36 skeleton rounded-lg self-end" />
        </div>
      </div>

      {/* Prompts sections */}
      {[1, 2, 3].map((i) => (
        <div key={i} className="form-section space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 skeleton rounded-xl" />
            <div>
              <div className="h-5 w-36 skeleton rounded" />
              <div className="h-3 w-52 skeleton rounded mt-1" />
            </div>
          </div>
          <div className="h-32 skeleton rounded-lg mt-4" />
        </div>
      ))}
    </div>
  );
}
