import React from 'react';

const PageSkeleton = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3"></div>
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
      </div>

      {/* Stats cards skeleton - 8 cards in responsive grid */}
      <div className="flex gap-4 mb-6 flex-wrap items-stretch">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
            <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px]">
              <div className="flex-1 flex flex-col p-4">
                <div className="flex flex-col h-full">
                  <div className="flex justify-end mb-2">
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  </div>
                  <div className="flex-1 flex flex-col justify-end">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2 w-3/4"></div>
                    <div className="h-8 bg-gray-200 rounded animate-pulse w-1/2"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters/Actions bar skeleton */}
      <div className="flex gap-4 items-center justify-between mb-6">
        <div className="flex gap-3">
          <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-28 bg-gray-200 rounded animate-pulse"></div>
          <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="h-10 w-36 bg-gray-200 rounded animate-pulse"></div>
      </div>

      {/* Table/Content skeleton */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm">
        {/* Table header skeleton */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-4">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-4 bg-gray-200 rounded animate-pulse flex-1"></div>
            ))}
          </div>
        </div>

        {/* Table rows skeleton */}
        {Array.from({ length: 5 }, (_, rowIndex) => (
          <div key={rowIndex} className="px-6 py-4 border-b border-gray-100">
            <div className="flex gap-4 items-center">
              {Array.from({ length: 6 }, (_, colIndex) => (
                <div 
                  key={colIndex} 
                  className={`h-4 bg-gray-200 rounded animate-pulse flex-1 ${
                    colIndex === 0 ? 'w-1/4' : colIndex === 5 ? 'w-20' : ''
                  }`}
                ></div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
        <div className="flex gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <div key={index} className="h-10 w-10 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageSkeleton;