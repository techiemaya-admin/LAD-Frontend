"use client";

import React from 'react';
import { cn } from '@/lib/utils';

interface PageLoaderOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
}

export const PageLoaderOverlay: React.FC<PageLoaderOverlayProps> = ({
  isVisible,
  message = "Loading...",
  className,
}) => {
  if (!isVisible) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity duration-300",
        !isVisible && "pointer-events-none opacity-0",
        className
      )}
    >
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 animate-spin" />
          </div>

          {/* Message */}
          {message && (
            <p className="text-center text-gray-700 font-medium">{message}</p>
          )}

          {/* Loading dots */}
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-100" />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce delay-200" />
          </div>
        </div>
      </div>
    </div>
  );
};
