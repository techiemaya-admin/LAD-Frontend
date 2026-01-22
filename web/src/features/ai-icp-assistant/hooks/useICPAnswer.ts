/**
 * useICPAnswer Hook
 * 
 * React hook for processing ICP answers.
 * Handles submission, loading, and error state.
 */
import { useState } from 'react';
import { processICPAnswer, type ICPAnswerRequest, type ICPAnswerResponse } from '../api';
export function useICPAnswer() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const submitAnswer = async (request: ICPAnswerRequest): Promise<ICPAnswerResponse> => {
    setLoading(true);
    setError(null);
    try {
      const response = await processICPAnswer(request);
      if (!response.success && response.error) {
        throw new Error(response.error);
      }
      return response;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to process answer');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  return { submitAnswer, loading, error };
}