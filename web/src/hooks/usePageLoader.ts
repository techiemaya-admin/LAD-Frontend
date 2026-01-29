"use client";

import { useCallback } from 'react';
import { loadingBus } from '@/lib/loading-bus';

export interface UsePageLoaderOptions {
  minVisibleMs?: number;
}

/**
 * Hook to control page loader programmatically
 * 
 * Usage:
 * const { show, hide } = usePageLoader();
 * 
 * // Show for a specific operation
 * const handleOperation = async () => {
 *   const hideAt = show();
 *   try {
 *     await someAsyncOperation();
 *   } finally {
 *     hide(hideAt);
 *   }
 * };
 */
export function usePageLoader(options: UsePageLoaderOptions = {}) {
  const { minVisibleMs = 300 } = options;

  const show = useCallback(() => {
    return loadingBus.requestStart(minVisibleMs);
  }, [minVisibleMs]);

  const hide = useCallback((hideAt: number) => {
    loadingBus.requestEnd(hideAt);
  }, []);

  const withLoader = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      minMs = minVisibleMs
    ): Promise<T> => {
      const hideAt = loadingBus.requestStart(minMs);
      try {
        return await asyncFn();
      } finally {
        loadingBus.requestEnd(hideAt);
      }
    },
    [minVisibleMs]
  );

  return { show, hide, withLoader };
}

export default usePageLoader;
