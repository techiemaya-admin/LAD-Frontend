/**
 * Hook to fetch all ICP questions
 * Generic hook following feature-based architecture
 */

import { useState, useEffect } from 'react';
import { fetchICPQuestions, type ICPQuestionsResponse } from '../api';

export function useItems(category: string = 'lead_generation') {
  const [items, setItems] = useState<ICPQuestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetchICPQuestions(category);
        setItems(response);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load items'));
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [category]);

  return { items, loading, error };
}

