/**
 * Hook to manage ICP onboarding conversation state
 * Tracks collected answers and handles answer submission
 * CRITICAL: Persists collectedAnswers to prevent Step 5 loops
 * 
 * Usage:
 * const { currentQuestion, collectedAnswers, submitAnswer, isLoading } = useConversation();
 */

import { useState, useCallback, useRef } from 'react';
import { processICPAnswer, type ICPAnswerRequest, type ICPAnswerResponse, type ICPQuestion } from '../api';

export function useConversation(
  category: string = 'lead_generation',
  initialCollectedAnswers: Record<string, any> = {}
) {
  // Track all collected answers across the conversation
  const [collectedAnswers, setCollectedAnswers] = useState<Record<string, any>>(initialCollectedAnswers);
  
  // Current step and question
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(1);
  const [currentQuestion, setCurrentQuestion] = useState<ICPQuestion | null>(null);
  const [currentIntentKey, setCurrentIntentKey] = useState<string>('');
  
  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [clarificationNeeded, setClarificationNeeded] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  // Track seen message IDs to prevent duplicate rendering
  const seenMessageIds = useRef(new Set<string>());

  /**
   * Submit a user answer and get the next question
   * CRITICAL: Sends collectedAnswers back to ensure backend context
   */
  const submitAnswer = useCallback(
    async (userAnswer: string): Promise<ICPAnswerResponse | null> => {
      if (!userAnswer.trim()) {
        setError(new Error('Answer cannot be empty'));
        return null;
      }

      try {
        setIsLoading(true);
        setError(null);

        // CRITICAL: Send currentIntentKey and ALL collectedAnswers to backend
        const request: ICPAnswerRequest = {
          currentStepIndex,
          userAnswer: userAnswer.trim(),
          category,
          currentIntentKey,  // Helps backend identify which platform/question we're answering
          collectedAnswers,  // CRITICAL: All previous answers to prevent Step 5 loops
        };

        const response = await processICPAnswer(request);

        if (!response.success) {
          setError(new Error('Failed to process answer'));
          return null;
        }

        // CRITICAL: Merge backend's updatedCollectedAnswers with our state
        if (response.updatedCollectedAnswers) {
          setCollectedAnswers(prev => ({
            ...prev,
            ...response.updatedCollectedAnswers,
          }));
        }

        // Update current step and question
        if (response.nextStepIndex !== null && response.nextStepIndex !== undefined) {
          setCurrentStepIndex(response.nextStepIndex);
        }

        if (response.nextQuestion) {
          // Check for duplicate message IDs
          if (response.nextQuestion.messageId) {
            if (seenMessageIds.current.has(response.nextQuestion.messageId)) {
              console.warn('[useConversation] Duplicate message detected, skipping');
              return response;
            }
            seenMessageIds.current.add(response.nextQuestion.messageId);
          }

          setCurrentQuestion(response.nextQuestion);
          setCurrentIntentKey(response.nextQuestion.intentKey || '');
        } else {
          setCurrentQuestion(null);
        }

        setClarificationNeeded(response.clarificationNeeded || false);
        setCompleted(response.completed || false);

        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [currentStepIndex, category, currentIntentKey, collectedAnswers]
  );

  /**
   * Reset conversation state (for starting over)
   */
  const reset = useCallback(() => {
    setCollectedAnswers(initialCollectedAnswers);
    setCurrentStepIndex(1);
    setCurrentQuestion(null);
    setCurrentIntentKey('');
    setError(null);
    setClarificationNeeded(false);
    setCompleted(false);
    seenMessageIds.current.clear();
  }, [initialCollectedAnswers]);

  /**
   * Manually set an answer (useful for pre-filling or corrections)
   */
  const setAnswer = useCallback((intentKey: string, value: any) => {
    setCollectedAnswers(prev => ({
      ...prev,
      [intentKey]: value,
    }));
  }, []);

  return {
    // Current state
    currentQuestion,
    currentStepIndex,
    currentIntentKey,
    collectedAnswers,
    
    // UI state
    isLoading,
    error,
    clarificationNeeded,
    completed,
    
    // Actions
    submitAnswer,
    reset,
    setAnswer,
  };
}
