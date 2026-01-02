/**
 * useICPQuestions Hook
 * 
 * React hook for fetching ICP questions.
 * Handles loading, error, and data state.
 */

import { useState, useEffect } from 'react';
import { fetchICPQuestions, type ICPQuestionsResponse } from '../api';
import { API_CONFIG } from '../config/api.config';

export function useICPQuestions(category: string = API_CONFIG.defaultCategory) {
  const [data, setData] = useState<ICPQuestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadQuestions() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchICPQuestions(category);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to load questions'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadQuestions();

    return () => {
      cancelled = true;
    };
  }, [category]);

  return { data, loading, error };
}

