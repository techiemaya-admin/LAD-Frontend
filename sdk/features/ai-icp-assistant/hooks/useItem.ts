/**
 * useItem Hook - Fetch a single ICP question
 * 
 * Loads a specific question by step index.
 * Handles loading and error states.
 */

import { useState, useEffect } from 'react';
import { fetchICPQuestionByStep } from '../api';
import type { ICPQuestion } from '../types';

export interface UseItemState {
  item: ICPQuestion | null;
  loading: boolean;
  error: Error | null;
}

export function useItem(
  stepIndex: number,
  category: string = 'lead_generation'
): UseItemState {
  const [item, setItem] = useState<ICPQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (stepIndex <= 0) {
      setLoading(false);
      setItem(null);
      return;
    }

    const loadItem = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchICPQuestionByStep(stepIndex, category);
        setItem(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load question');
        setError(error);
        setItem(null);
      } finally {
        setLoading(false);
      }
    };

    loadItem();
  }, [stepIndex, category]);

  return { item, loading, error };
}
