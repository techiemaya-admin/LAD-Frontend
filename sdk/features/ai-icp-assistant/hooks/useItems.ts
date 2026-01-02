/**
 * useItems Hook - Fetch all ICP questions
 * 
 * Loads all questions for a category.
 * Handles loading and error states.
 */

import { useState, useEffect } from 'react';
import { fetchICPQuestions } from '../api';
import type { ICPQuestionsResponse } from '../types';

export interface UseItemsState {
  items: ICPQuestionsResponse | null;
  loading: boolean;
  error: Error | null;
}

export function useItems(
  category: string = 'lead_generation'
): UseItemsState {
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
        const error = err instanceof Error ? err : new Error('Failed to load questions');
        setError(error);
        setItems(null);
      } finally {
        setLoading(false);
      }
    };

    loadItems();
  }, [category]);

  return { items, loading, error };
}
