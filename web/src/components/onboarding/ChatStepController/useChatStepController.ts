/**
 * Chat Step Controller - Main Hook
 * 
 * Main hook for managing conversational ICP onboarding flow
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { logger } from '@/lib/logger';
import {
  fetchICPQuestions,
  fetchICPQuestionByStep,
  type ICPQuestion as APIICPQuestion,
  type ICPAnswerResponse,
} from '@/features/ai-icp-assistant';
import {
  formatQuestionForChat,
  convertAPIQuestionToLegacy,
  type ICPQuestion,
} from '@/lib/icpQuestionsConfig';
import { processAnswer } from './handlers';
import { handleOptionSelection } from './optionHandlers';

// Module-level lock to prevent race conditions when startFlow is called multiple times quickly
let isStartingFlow = false;
export function useChatStepController(
  onComplete: (answers: Record<string, any>) => void,
  onUpdatePreview?: (stepIndex: number, answer: any) => void
) {
  const { addAIMessage, setIsProcessingAI, aiMessages, isICPFlowStarted, setIsICPFlowStarted } = useOnboardingStore();

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<APIICPQuestion[]>([]);
  const [totalSteps, setTotalSteps] = useState(11);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const hasStartedRef = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      hasStartedRef.current = false;
      // Do NOT reset isICPFlowStarted here, so flow state is preserved across navigation
    };
  }, []);

  // Fetch questions from API on mount
  useEffect(() => {
    const loadQuestions = async () => {
      try {
        setIsLoadingQuestions(true);
        const response = await fetchICPQuestions('lead_generation');
        if (response.success) {
          setQuestions(response.questions);
          setTotalSteps(response.totalSteps);
        }
      } catch (error: any) {
        logger.error('Error loading questions', error);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, []);

  const currentQuestion = questions[currentStepIndex];

  if (currentStepIndex >= 4) {
    logger.debug('Current question at index', { currentStepIndex, intentKey: currentQuestion?.intentKey });
  }

  const isComplete = currentStepIndex >= totalSteps;

  if (currentStepIndex >= 7) {
    logger.debug('isComplete check', { currentStepIndex, totalSteps, isComplete });
  }

  /**
   * Start the conversational flow
   */
  const startFlow = useCallback(async () => {
    // CRITICAL: Use module-level synchronous lock to prevent race conditions
    // This must be checked FIRST before any async operations
    if (isStartingFlow) {
      logger.debug('Flow is currently starting - module lock active, skipping');
      return;
    }

    // Check global flag first - most reliable
    if (isICPFlowStarted) {
      logger.debug('Flow already started - global flag is true, skipping');
      return;
    }

    if (hasStartedRef.current) {
      logger.debug('startFlow already called, skipping');
      return;
    }

    // Check if we already have messages in the store (more reliable than local ref)
    if (aiMessages.length > 0) {
      logger.debug('Flow already started - messages exist in store, skipping');
      hasStartedRef.current = true;
      setIsICPFlowStarted(true);
      return;
    }

    const hasFirstQuestion = aiMessages.some(
      (msg: any) => msg.role === 'ai' && msg.content.includes("Let's get started")
    );

    if (hasFirstQuestion) {
      logger.debug('First question already in messages, skipping');
      hasStartedRef.current = true;
      setIsICPFlowStarted(true);
      return;
    }

    // Set module-level lock IMMEDIATELY (synchronous)
    isStartingFlow = true;

    // Set flags immediately to prevent race conditions
    hasStartedRef.current = true;
    setIsICPFlowStarted(true);
    setIsLoading(true);
    setIsProcessingAI(true);

    try {
      const response = await fetchICPQuestionByStep(1, undefined, 'lead_generation');

      if (!response.success || !response.question) {
        throw new Error(response.error || 'Failed to fetch first question');
      }

      const formattedQuestion = formatQuestionForChat(
        convertAPIQuestionToLegacy(response.question),
        1,
        response.question.stepIndex || 9
      );

      addAIMessage({
        role: 'ai',
        content: formattedQuestion,
        timestamp: new Date(),
      });

      setCurrentStepIndex(0);
      setQuestions([response.question]);
      const steps = (response as any).totalSteps || 11;
      logger.debug('startFlow - setting totalSteps', { steps, apiTotalSteps: (response as any).totalSteps });
      setTotalSteps(steps);
    } catch (error: any) {
      logger.error('Error starting flow', error);

      const isConnectionError = error?.message?.includes('Failed to fetch') ||
        error?.message?.includes('ERR_CONNECTION_REFUSED') ||
        error?.name === 'TypeError';

      const errorMessage = isConnectionError
        ? 'Error: Cannot connect to backend server. Please ensure the ICP backend is running on port 3001.'
        : `Error: Could not start campaign setup. ${error?.message || 'Please refresh the page.'}`;

      addAIMessage({
        role: 'ai',
        content: errorMessage,
        timestamp: new Date(),
      });
      hasStartedRef.current = false;
      setIsICPFlowStarted(false); // Reset global flag on error
      isStartingFlow = false; // Reset module-level lock on error
    } finally {
      setIsLoading(false);
      setIsProcessingAI(false);
    }
  }, [addAIMessage, setIsProcessingAI, aiMessages, isICPFlowStarted, setIsICPFlowStarted]);

  /**
   * Handle user answer submission
   */
  const handleAnswer = useCallback(async (userInput: string) => {

    // For dynamically generated questions (like delay questions), currentQuestion might be undefined
    // But we can still process the answer using the questions array
    const questionToUse = questions[currentStepIndex] || currentQuestion;

    if (!questionToUse && isNaN(currentStepIndex)) {
      console.error('[handleAnswer] No valid question or step index - cannot process answer');
      return;
    }

    if (isLoading || isComplete) {
      return;
    }

    setIsLoading(true);
    setIsProcessingAI(true);

    try {
      const result = await processAnswer(
        userInput,
        questionToUse || currentQuestion,
        currentStepIndex,
        answers,
        questions,
        totalSteps,
        onUpdatePreview
      );

      if (!result.success) {
        if (result.error) {
          addAIMessage({
            role: 'ai',
            content: result.error,
            timestamp: new Date(),
          });
        }
        setIsLoading(false);
        setIsProcessingAI(false);
        return;
      }

      // Handle clarification needed
      if (result.clarificationNeeded) {
        addAIMessage({
          role: 'ai',
          content: result.message || `Please provide more details. ${currentQuestion?.helperText || ''}`,
          timestamp: new Date(),
        });
        setIsLoading(false);
        setIsProcessingAI(false);
        return;
      }

      // If AI corrected the spelling, show a helpful message
      if (result.correctedAnswer && result.correctedAnswer !== userInput) {
        addAIMessage({
          role: 'ai',
          content: `I understood "${result.correctedAnswer}" (corrected from "${userInput}"). Continuing...`,
          timestamp: new Date(),
        });
      }

      // Update answers if backend provided updated version
      const latestQuestion = questions[currentStepIndex] || currentQuestion;
      const intentKeyToUse = latestQuestion?.intentKey || currentQuestion?.intentKey;

      if (result.updatedCollectedAnswers) {
        logger.debug('Using updatedCollectedAnswers from backend', { updatedCollectedAnswers: result.updatedCollectedAnswers });
        setAnswers(result.updatedCollectedAnswers);
      } else {
        // Update local answers
        setAnswers(prev => ({
          ...prev,
          [intentKeyToUse]: userInput,
        }));
      }

      // Handle completion
      if (result.completed || !result.nextQuestion || result.nextStepIndex === null) {
        logger.debug('Flow completed - marking as complete');
        addAIMessage({
          role: 'ai',
          content: result.message || "Great! I've understood your requirements. Building your workflow now…",
          timestamp: new Date(),
        });
        setCurrentStepIndex(totalSteps);
        onComplete(result.updatedCollectedAnswers || answers);
        setIsLoading(false);
        setIsProcessingAI(false);
        return;
      }

      // Show next question
      if (result.nextQuestion) {
        // Handle nextStepIndex - if undefined, keep current step (for dynamic questions like delays)
        const backendStepIndex = result.nextStepIndex !== null && result.nextStepIndex !== undefined
          ? result.nextStepIndex
          : (result.nextQuestion.stepIndex || currentStepIndex + 1);

        const formattedQuestion = formatQuestionForChat(
          convertAPIQuestionToLegacy(result.nextQuestion),
          backendStepIndex,
          totalSteps
        );

        addAIMessage({
          role: 'ai',
          content: formattedQuestion,
          timestamp: new Date(),
        });

        const nextIndex = backendStepIndex - 1;
        logger.debug('Moving to next step', {
          nextStepIndex: backendStepIndex,
          nextIndex,
          totalSteps,
          isComplete: nextIndex >= totalSteps
        });

        // Update questions array
        if (nextIndex >= 0 && result.nextQuestion) {
          setQuestions(prev => {
            const updated = [...prev];
            const existingQuestion = updated[nextIndex];
            const newIntentKey = result.nextQuestion!.intentKey;
            const existingIntentKey = existingQuestion?.intentKey;

            if (!existingQuestion || existingIntentKey !== newIntentKey) {
              updated[nextIndex] = result.nextQuestion!;
              logger.debug('Updated question at index', {
                nextIndex,
                newIntentKey,
                existingIntentKey: existingIntentKey || 'none'
              });
            }
            return updated;
          });

          // Trigger workflow generation when reaching confirmation step
          if (result.nextQuestion.intentKey === 'confirmation') {
            logger.debug('Reached confirmation step - triggering workflow generation');
            const answersForWorkflow = result.updatedCollectedAnswers || answers;
            if (onUpdatePreview) {
              onUpdatePreview(-1, answersForWorkflow);
            }
          }
        }

        setCurrentStepIndex(nextIndex);
      }
    } catch (error: any) {
      logger.error('Error processing answer', error);
      addAIMessage({
        role: 'ai',
        content: `Error processing your answer: ${error.message}. Please try again.`,
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setIsProcessingAI(false);
    }
  }, [currentQuestion, currentStepIndex, answers, isLoading, isComplete, questions, totalSteps, addAIMessage, onUpdatePreview, onComplete, setIsProcessingAI]);

  /**
   * Handle option selection
   */
  const handleOptionSubmit = useCallback(async (selectedValues: string[]) => {
    await handleOptionSelection(
      selectedValues,
      currentQuestion,
      questions,
      currentStepIndex,
      handleAnswer
    );
  }, [handleAnswer, currentQuestion, questions, currentStepIndex]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    if (currentStepIndex === 0) return;
    setCurrentStepIndex(currentStepIndex - 1);
  }, [currentStepIndex]);

  /**
   * Get current answer for editing
   */
  const getCurrentAnswer = useCallback(() => {
    if (!currentQuestion) return '';
    const answer = answers[currentQuestion.intentKey];

    if (currentQuestion.questionType === 'boolean') {
      return answer === true ? 'yes' : answer === false ? 'no' : '';
    }

    if (Array.isArray(answer)) {
      return answer.join(', ');
    }

    return answer || '';
  }, [currentQuestion, answers]);

  /**
   * Reset flow
   */
  const reset = useCallback(() => {
    setCurrentStepIndex(0);
    setAnswers({});
    setIsLoading(false);
    hasStartedRef.current = false;
  }, []);

  return {
    startFlow,
    handleAnswer,
    handleOptionSubmit,
    handleBack,
    getCurrentAnswer,
    reset,
    currentStepIndex,
    isComplete,
    isLoading: isLoading || isLoadingQuestions,
    currentQuestion: currentQuestion ? convertAPIQuestionToLegacy(currentQuestion) : null,
    totalSteps,
    answers,
    isLoadingQuestions,
  };
}

