/**
 * Hook to fetch a single ICP question by step index
 * Generic hook following feature-based architecture
 */

import { useState, useEffect } from 'react';
import { fetchICPQuestionByStep, type ICPQuestion } from '../api';

export function useItem(
  stepIndex: number,
  category: string = 'lead_generation'
) {
  const [item, setItem] = useState<ICPQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadItem = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchICPQuestionByStep(stepIndex, category);
        setItem(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load item'));
      } finally {
        setLoading(false);
      }
    };

    if (stepIndex > 0) {
      loadItem();
    } else {
      setLoading(false);
    }
  }, [stepIndex, category]);

  return { item, loading, error };
}

