"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

interface UseOptimisticNavigateOptions {
  showLoader?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useOptimisticNavigate(
  options: UseOptimisticNavigateOptions = {}
) {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const navigate = useCallback(
    async (
      path: string,
      asyncAction?: () => Promise<void>
    ) => {
      setIsNavigating(true);

      try {
        // Navigate immediately (optimistic)
        router.push(path);

        // Then execute async action if provided
        if (asyncAction) {
          await asyncAction();
        }

        options.onSuccess?.();
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error("Navigation error:", err);
        options.onError?.(err);
      } finally {
        setIsNavigating(false);
      }
    },
    [router, options]
  );

  return { navigate, isNavigating };
}
