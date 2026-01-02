'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import {
  fetchICPQuestions,
  fetchICPQuestionByStep,
  processICPAnswer,
  type ICPQuestion as APIICPQuestion,
  type ICPAnswerResponse,
} from '@/features/ai-icp-assistant';
import {
  formatQuestionForChat,
  parseAnswer,
  validateAnswer,
  convertAPIQuestionToLegacy,
  type ICPQuestion,
} from '@/lib/icpQuestionsConfig';

/**
 * Hook to manage conversational ICP onboarding flow
 * Handles step progression, answer validation, and state management
 */
export function useChatStepController(
  onComplete: (answers: Record<string, any>) => void,
  onUpdatePreview?: (stepIndex: number, answer: any) => void
) {
  const { addAIMessage, setIsProcessingAI, aiMessages } = useOnboardingStore();
  
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<APIICPQuestion[]>([]);
  const [totalSteps, setTotalSteps] = useState(11); // Updated to 11 steps (added delays and conditions)
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const hasStartedRef = useRef(false);

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
        console.error('[ChatStepController] Error loading questions:', error);
        // Don't show error message here - will be shown when user tries to start flow
        // This prevents error spam on page load
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    loadQuestions();
  }, []);

  // CRITICAL FIX: Get current question from array, but prefer the most recent one if available
  // This ensures we use the correct question even when questions array hasn't updated yet
  const currentQuestion = questions[currentStepIndex];
  
  // Debug: Log current question state
  if (currentStepIndex >= 4) {
    console.log(`[ChatStepController] Current question at index ${currentStepIndex}:`, currentQuestion?.intentKey);
  }
  // Only mark as complete if we've actually completed all steps (Step 9/confirmation answered)
  // Don't use questions.length as it may not be fully populated yet
  const isComplete = currentStepIndex >= totalSteps;
  
  // Debug logging for isComplete calculation
  if (currentStepIndex >= 7) {
    console.log(`[ChatStepController] isComplete check - currentStepIndex: ${currentStepIndex}, totalSteps: ${totalSteps}, isComplete: ${isComplete}`);
  }

  /**
   * Start the conversational flow
   */
  const startFlow = useCallback(async () => {
    if (hasStartedRef.current) {
      console.log('[ChatStepController] startFlow already called, skipping');
      return;
    }
    
    // Check if question already exists in messages to prevent duplicates
    const hasFirstQuestion = aiMessages.some(
      (msg: any) => msg.role === 'ai' && msg.content.includes("Let's get started")
    );
    
    if (hasFirstQuestion) {
      console.log('[ChatStepController] First question already in messages, skipping');
      hasStartedRef.current = true;
      return;
    }
    
    hasStartedRef.current = true;
    setIsLoading(true);
    setIsProcessingAI(true);
    
    try {
      // Fetch first question directly from API
      const response = await fetchICPQuestionByStep(1, undefined, 'lead_generation');
      
      if (!response.success || !response.question) {
        throw new Error(response.error || 'Failed to fetch first question');
      }
      
      // Add first question to chat (it already has "Step X of 9" prefix from backend)
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
      
      // Update state
      setCurrentStepIndex(0);
      setQuestions([response.question]);
      // Use totalSteps from API response, or default to 11
      // Note: fetchICPQuestionByStep doesn't return totalSteps, so we default to 11
      const steps = (response as any).totalSteps || 11;
      console.log(`[ChatStepController] startFlow - setting totalSteps to: ${steps} (from API: ${(response as any).totalSteps})`);
      setTotalSteps(steps);
    } catch (error: any) {
      console.error('[ChatStepController] Error starting flow:', error);
      
      // Check if it's a connection error
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
      hasStartedRef.current = false; // Reset on error
    } finally {
      setIsLoading(false);
      setIsProcessingAI(false);
    }
  }, [addAIMessage, setIsProcessingAI, aiMessages]);

  /**
   * Handle user answer submission
   * Uses API to process answer and get next step via Gemini
   */
  const handleAnswer = useCallback(async (userInput: string) => {
    if (!currentQuestion || isLoading || isComplete) return;
    
    // Validate userInput is a string
    if (!userInput || typeof userInput !== 'string') {
      addAIMessage({
        role: 'ai',
        content: 'Please provide a valid answer.',
        timestamp: new Date(),
      });
      return;
    }
    
    setIsLoading(true);
    setIsProcessingAI(true);

    try {
      // Convert API question to legacy format for validation
      const legacyQuestion = convertAPIQuestionToLegacy(currentQuestion);
      
      // Parse and validate answer locally first
      const parsedAnswer = parseAnswer(legacyQuestion, String(userInput).trim());
      const isValid = validateAnswer(legacyQuestion, parsedAnswer);
      
      if (!isValid) {
        // Show validation error message
        addAIMessage({
          role: 'ai',
          content: `Please provide a valid answer. ${currentQuestion.helperText || ''}`,
          timestamp: new Date(),
        });
        setIsLoading(false);
        setIsProcessingAI(false);
        return;
      }
      
      // CRITICAL FIX: Get the most up-to-date question from the questions array
      // This ensures we use the correct intentKey (e.g., linkedin_template vs linkedin_actions)
      const latestQuestion = questions[currentStepIndex] || currentQuestion;
      const intentKeyToUse = latestQuestion?.intentKey || currentQuestion?.intentKey;
      
      console.log(`[ChatStepController] Storing answer with intentKey: ${intentKeyToUse}`);
      
      // Store answer
      const newAnswers = {
        ...answers,
        [intentKeyToUse]: parsedAnswer,
      };
      setAnswers(newAnswers);
      
      // Debug current answers
      console.log('[ChatStepController] Updated answers:', newAnswers);
      console.log('[ChatStepController] Current step index:', currentStepIndex);
      
      // Expose current answers globally for progressive workflow updates
      (window as any).__icpAnswers = newAnswers;
      (window as any).__currentStepIndex = currentStepIndex;
      
      // Immediately trigger progressive workflow update
      try {
        const { generateProgressiveWorkflowPreview } = await import('@/lib/workflowGenerator');
        const workflowSteps = generateProgressiveWorkflowPreview(newAnswers, currentStepIndex);
        console.log('[ChatStepController] Generated progressive workflow:', workflowSteps);
        
        // Update workflow preview in store
        const { useOnboardingStore } = await import('@/store/onboardingStore');
        useOnboardingStore.getState().setWorkflowPreview(workflowSteps);
      } catch (err) {
        console.error('[ChatStepController] Error generating progressive workflow:', err);
      }
      
      // Trigger workflow update event
      const updateEvent = new CustomEvent('workflowUpdate', { 
        detail: { answers: newAnswers, stepIndex: currentStepIndex } 
      });
      window.dispatchEvent(updateEvent);
      
      // Update preview if callback provided
      if (onUpdatePreview) {
        onUpdatePreview(currentStepIndex, parsedAnswer);
      }
      
      // Prepare collected answers for Step 7 (confirmation)
      // Include the current answer that's about to be stored
      const allCollectedAnswers = {
        ...answers,
        [intentKeyToUse]: parsedAnswer,
      };
      
      // Call API to process answer and get next step (Gemini decides)
      const apiStepIndex = currentStepIndex + 1; // API uses 1-based indexing
      
      console.log(`[ChatStepController] Calling processICPAnswer - Step: ${apiStepIndex} (frontend: ${currentStepIndex}), Intent: ${intentKeyToUse}, Answer: "${userInput}"`);
      console.log(`[ChatStepController] Current question from array:`, latestQuestion);
      console.log(`[ChatStepController] Current question from state:`, currentQuestion);
      
      // CRITICAL FIX: Don't mark platforms as completed if they need templates but don't have them
      // The backend is the source of truth, but we help by not incorrectly marking platforms as done
      // Helper function to check if a platform action requires a template
      const actionRequiresTemplate = (platform: string, actions: string): boolean => {
        const actionsLower = String(actions || '').toLowerCase();
        if (platform === 'linkedin') {
          return actionsLower.includes('message') && (actionsLower.includes('after accepted') || actionsLower.includes('send message'));
        }
        if (platform === 'whatsapp') {
          return actionsLower.includes('message') || actionsLower.includes('broadcast');
        }
        if (platform === 'voice') {
          return actionsLower.includes('call') || actionsLower.includes('trigger') || actionsLower.includes('script');
        }
        return false; // Email doesn't require template in onboarding
      };

      // Start with existing completed_platform_actions, but filter out platforms that need templates but don't have them
      let completedPlatforms: string[] = Array.isArray(allCollectedAnswers.completed_platform_actions)
        ? [...allCollectedAnswers.completed_platform_actions]
        : [];

      // Remove platforms that have actions but need templates and don't have them
      completedPlatforms = completedPlatforms.filter((p) => {
        const actionsKey = `${p}_actions`;
        const templateKey = `${p}_template`;
        const hasActions = allCollectedAnswers[actionsKey] !== undefined && String(allCollectedAnswers[actionsKey]).trim() !== '';
        const hasTemplate = allCollectedAnswers[templateKey] !== undefined;
        
        if (hasActions) {
          const needsTemplate = actionRequiresTemplate(p, String(allCollectedAnswers[actionsKey] || ''));
          // Keep in completed only if: no template needed OR template is provided
          return !needsTemplate || hasTemplate;
        }
        return true; // Keep if no actions (shouldn't happen, but safe)
      });

      // Add platforms that have actions and (no template needed OR template provided) but aren't in completed yet
      ['linkedin', 'whatsapp', 'email', 'voice'].forEach((p) => {
        const actionsKey = `${p}_actions`;
        const templateKey = `${p}_template`;
        const hasActions = allCollectedAnswers[actionsKey] !== undefined && String(allCollectedAnswers[actionsKey]).trim() !== '';
        const hasTemplate = allCollectedAnswers[templateKey] !== undefined;
        
        if (!completedPlatforms.includes(p) && hasActions) {
          // Only mark as completed if:
          // 1. Has actions AND no template needed, OR
          // 2. Has actions AND template is provided
          const needsTemplate = actionRequiresTemplate(p, String(allCollectedAnswers[actionsKey] || ''));
          if (!needsTemplate || hasTemplate) {
            completedPlatforms.push(p);
          }
        }
      });

      const payloadCollectedAnswers = {
        ...allCollectedAnswers,
        completed_platform_actions: completedPlatforms
      };

      const response: ICPAnswerResponse = await processICPAnswer({
        currentStepIndex: apiStepIndex,
        userAnswer: userInput,
        category: 'lead_generation',
        collectedAnswers: payloadCollectedAnswers,
        currentIntentKey: intentKeyToUse, // Use the latest intentKey
      });
      
      console.log(`[ChatStepController] Received response - success: ${response.success}, nextStepIndex: ${response.nextStepIndex}, hasQuestion: ${!!response.nextQuestion}`);

      if (!response.success) {
        throw new Error(response.error || 'Failed to process answer');
      }

      // Handle clarification needed
      if (response.clarificationNeeded) {
        // Show clarification message only (don't re-show the question)
        addAIMessage({
          role: 'ai',
          content: response.message || `Please provide more details. ${currentQuestion.helperText || ''}`,
          timestamp: new Date(),
        });
        
        setIsLoading(false);
        setIsProcessingAI(false);
        return;
      }

      // Handle completion
      if (response.completed || (response.nextStepIndex === null && !response.nextQuestion)) {
        console.log('[ChatStepController] Flow completed - marking as complete');
        addAIMessage({
          role: 'ai',
          content: response.message || "Great! I've understood your requirements. Building your workflow now…",
          timestamp: new Date(),
        });
        setIsLoading(false);
        setIsProcessingAI(false);
        // Mark as complete by setting step index to totalSteps
        setCurrentStepIndex(totalSteps);
        onComplete(newAnswers);
        return;
      }

      // CRITICAL FIX: Use backend's updatedCollectedAnswers if provided (backend is source of truth)
      if (response.updatedCollectedAnswers) {
        console.log('[ChatStepController] Using updatedCollectedAnswers from backend:', response.updatedCollectedAnswers);
        setAnswers(response.updatedCollectedAnswers);
      }

      // Show next question from API response
      if (response.nextQuestion && response.nextStepIndex !== null) {
        const formattedQuestion = formatQuestionForChat(
          convertAPIQuestionToLegacy(response.nextQuestion),
          response.nextStepIndex,
          totalSteps
        );
        
        addAIMessage({
          role: 'ai',
          content: formattedQuestion,
          timestamp: new Date(),
        });
        
        // Update to 0-based index for internal state
        const nextIndex = response.nextStepIndex - 1;
        console.log(`[ChatStepController] Moving to next step - nextStepIndex: ${response.nextStepIndex} (1-based), nextIndex: ${nextIndex} (0-based), totalSteps: ${totalSteps}, isComplete will be: ${nextIndex >= totalSteps}`);
        
        // CRITICAL FIX: Always update the question at the next index if intentKey is different
        // This handles cases where same stepIndex has different questions (e.g., linkedin_template vs whatsapp_actions)
        if (nextIndex >= 0 && response.nextQuestion) {
          setQuestions(prev => {
            const updated = [...prev];
            const existingQuestion = updated[nextIndex];
            const newIntentKey = response.nextQuestion!.intentKey;
            const existingIntentKey = existingQuestion?.intentKey;
            
            // Always update if:
            // 1. Question doesn't exist at this index, OR
            // 2. IntentKey is different (e.g., linkedin_template -> whatsapp_actions)
            if (!existingQuestion || existingIntentKey !== newIntentKey) {
              updated[nextIndex] = response.nextQuestion!;
              console.log(`[ChatStepController] Updated question at index ${nextIndex} with intentKey: ${newIntentKey} (was: ${existingIntentKey || 'none'})`);
            }
            return updated;
          });
          
          // Trigger workflow generation when reaching confirmation step
          if (response.nextQuestion.intentKey === 'confirmation') {
            console.log('[ChatStepController] Reached confirmation step - triggering workflow generation');
            // Use the updatedCollectedAnswers from backend which has all the data
            const answersForWorkflow = response.updatedCollectedAnswers || newAnswers;
            // Call onUpdatePreview to trigger workflow generation in ChatPanel
            if (onUpdatePreview) {
              onUpdatePreview(-1, answersForWorkflow); // Use -1 to indicate "generate workflow"
            }
          }
        }
        
        setCurrentStepIndex(nextIndex);
      }
    } catch (error: any) {
      console.error('[ChatStepController] Error processing answer:', error);
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
   * Handle option selection (for selectable options UI)
   * Converts selected options array to comma-separated string and processes as answer
   */
  const handleOptionSubmit = useCallback(async (selectedValues: string[]) => {
    // CRITICAL FIX: Get the most up-to-date question from the questions array
    // This ensures we use the correct intentKey even if React hasn't re-rendered yet
    const latestQuestion = questions[currentStepIndex] || currentQuestion;
    const questionToUse = latestQuestion || currentQuestion;
    
    // Handle special cases for campaign settings
    const selectedValue = selectedValues[0]; // Single select for campaign settings
    
    console.log(`[ChatStepController] handleOptionSubmit - Using intentKey: ${questionToUse?.intentKey}, Selected values: ${JSON.stringify(selectedValues)}`);
    
    // Check if it's a "Custom" option - we'll need to prompt for input
    if (selectedValue === 'Custom' && questionToUse?.intentKey === 'leads_per_day') {
      // For now, just pass "Custom" and let the backend handle it
      // In the future, we could show a text input here
      await handleAnswer('Custom');
      return;
    }
    
    if (selectedValue === 'Custom' && questionToUse?.intentKey === 'campaign_days') {
      await handleAnswer('Custom');
      return;
    }
    
    // Parse numeric values from options like "10 leads", "25 leads", "50 leads"
    // Extract just the number for leads_per_day
    if (questionToUse?.intentKey === 'leads_per_day' && selectedValue) {
      const match = selectedValue.match(/(\d+)\s*leads?/i);
      if (match) {
        await handleAnswer(match[1]); // Send just the number
        return;
      }
    }
    
    // Parse numeric values from options like "7 days", "14 days", etc.
    if (questionToUse?.intentKey === 'campaign_days' && selectedValue) {
      const match = selectedValue.match(/(\d+)\s*days?/i);
      if (match) {
        await handleAnswer(match[1]); // Send just the number
        return;
      }
    }
    
    // For other options, convert to comma-separated string
    const answerText = selectedValues.join(', ');
    await handleAnswer(answerText);
  }, [handleAnswer, currentQuestion, questions, currentStepIndex]);

  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    if (currentStepIndex === 0) return;
    
    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    
    // Note: Message history cleanup should be handled by parent component
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

