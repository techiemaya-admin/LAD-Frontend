"use client";

import React from 'react';
import { LoadingContext } from '@/components/providers/loading-provider';

interface PageLoaderProps {
  minVisibleMs?: number;
  className?: string;
  spinnerClassName?: string;
  messageClassName?: string;
  message?: string | null;
  showMessage?: boolean;
}

/**
 * Universal Page Loader Component
 * Integrates with the global loading bus to display a full-page loader overlay
 * automatically when network requests or operations are in progress.
 * 
 * Usage:
 * 1. Place in layout alongside providers
 * 2. Use usePageLoader hook to control programmatically
 * 3. Automatically shows during fetch operations
 */
export const PageLoader: React.FC<PageLoaderProps> = ({
  minVisibleMs = 300,
  className = '',
  spinnerClassName = '',
  messageClassName = '',
  message = 'Loading...',
  showMessage = true,
}) => {
  const loadingState = React.useContext(LoadingContext);
  const isVisible = loadingState.activeCount > 0;
  const hasMinVisibleTime = loadingState.nextHideAt !== null && Date.now() < loadingState.nextHideAt;

  // Show if there are active operations OR if minimum visible time hasn't elapsed
  const shouldShow = isVisible || hasMinVisibleTime;

  if (!shouldShow) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-300 ${
        isVisible || hasMinVisibleTime ? 'bg-black/40 backdrop-blur-sm opacity-100' : 'bg-black/0 opacity-0 pointer-events-none'
      } ${className}`}
    >
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center gap-4">
          {/* Animated Spinner */}
          <div className={`relative w-12 h-12 ${spinnerClassName}`}>
            <div className="absolute inset-0 rounded-full border-4 border-gray-200" />
            <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-600 border-r-blue-600 animate-spin" />
          </div>

          {/* Loading Message */}
          {showMessage && message && (
            <p className={`text-center text-gray-700 font-medium ${messageClassName}`}>
              {message}
            </p>
          )}

          {/* Loading Dots Animation */}
          <div className="flex gap-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '100ms' }} />
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '200ms' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
