/**
 * Chat Step Controller - Main Hook
 * 
 * Main hook for managing conversational ICP onboarding flow
 * 
 * LAD Architecture: This is a thin UI hook that calls SDK functions.
 * Business logic lives in @lad/frontend-features/ai-icp-assistant
 */
'use client';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { logger } from '@/lib/logger';
import {
  fetchICPQuestions,
  fetchICPQuestionByStep,
  processICPAnswer,
  getBufferedConversation,
  getCurrentStepFromBuffer,
  hasBufferedMessages,
  type ICPQuestion as APIICPQuestion,
  type ICPAnswerResponse,
  type BufferedMessage,
} from '@lad/frontend-features/ai-icp-assistant';
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
  onComplete: (answers: Record<string, any>, conversationId?: string) => void,
  onUpdatePreview?: (stepIndex: number, answer: any) => void
) {
  const { addAIMessage, clearAIMessages, setIsProcessingAI, aiMessages, isICPFlowStarted, setIsICPFlowStarted } = useOnboardingStore();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<APIICPQuestion[]>([]);
  const [totalSteps, setTotalSteps] = useState(11);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
  const [inboundLeadData, setInboundLeadData] = useState<any>(null);
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

    // CRITICAL: Check for buffered messages in localStorage FIRST (before any other checks)
    // This takes precedence over store persistence because SDK buffer is the source of truth
    const sessionId = 'default_session'; // Must match the sessionId used in processICPAnswer
    logger.debug('[ICP Flow] Checking for buffered messages', { sessionId, aiMessagesLength: aiMessages.length, isICPFlowStarted });
    
    if (hasBufferedMessages(sessionId)) {
      logger.debug('[ICP Flow] Found buffered messages in localStorage, restoring conversation');
      
      const bufferedMessages = getBufferedConversation(sessionId);
      const currentStep = getCurrentStepFromBuffer(sessionId);
      
      logger.debug('[ICP Flow] Restoring conversation state', {
        messageCount: bufferedMessages.length,
        currentStep,
        firstMessage: bufferedMessages[0]?.content.substring(0, 50),
        lastMessage: bufferedMessages[bufferedMessages.length - 1]?.content.substring(0, 50),
      });

      // Clear any existing messages in store before restoring from buffer
      clearAIMessages();

      // Restore all messages to chat UI
      bufferedMessages.forEach((msg: BufferedMessage, index: number) => {
        addAIMessage({
          role: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: new Date(msg.timestamp),
        });
        logger.debug('[ICP Flow] Restored message', { 
          index, 
          role: msg.role, 
          stepIndex: msg.stepIndex,
          contentPreview: msg.content.substring(0, 50) 
        });
      });

      // Restore collected answers from the last user message with collectedAnswers
      const restoredAnswers: Record<string, any> = {};
      for (let i = bufferedMessages.length - 1; i >= 0; i--) {
        const msg = bufferedMessages[i];
        if (msg.role === 'user' && msg.messageData?.collectedAnswers) {
          Object.assign(restoredAnswers, msg.messageData.collectedAnswers);
          // Also include top-level message data properties like linkedin_connection_message
          if (msg.messageData.linkedin_connection_message) {
            restoredAnswers.linkedin_connection_message = msg.messageData.linkedin_connection_message;
          }
          if (msg.messageData.linkedin_message_template) {
            restoredAnswers.linkedin_message_template = msg.messageData.linkedin_message_template;
          }
          break; // Use the most recent collectedAnswers
        }
      }
      
      setAnswers(restoredAnswers);
      setCurrentStepIndex(currentStep);
      hasStartedRef.current = true;
      setIsICPFlowStarted(true);
      
      logger.debug('[ICP Flow] Successfully restored conversation from localStorage', {
        messageCount: bufferedMessages.length,
        currentStep,
        answersCount: Object.keys(restoredAnswers).length,
      });
      
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
      logger.error('[handleAnswer] No valid question or step index - cannot process answer');
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
        // CRITICAL FIX: Save updatedCollectedAnswers even when clarification needed
        // This preserves pendingClassification for industry confirmation flow
        if (result.updatedCollectedAnswers) {
          logger.debug('Saving updatedCollectedAnswers during clarification', { 
            updatedCollectedAnswers: result.updatedCollectedAnswers,
            hasPendingClassification: !!result.updatedCollectedAnswers.pendingClassification 
          });
          setAnswers(result.updatedCollectedAnswers);
        }
        // Convert backend options format to frontend format if needed
        const optionsForMessage = result.options?.map((opt: any) => ({
          label: opt.text || opt.label,
          value: opt.value
        }));
        addAIMessage({
          role: 'ai',
          content: result.message || `Please provide more details. ${currentQuestion?.helperText || ''}`,
          timestamp: new Date(),
          options: optionsForMessage, // Include clickable options from backend
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
        logger.debug('Flow completed - marking as complete', { conversationId: result.conversationId });
        addAIMessage({
          role: 'ai',
          content: result.message || "Great! I've understood your requirements. Building your workflow now…",
          timestamp: new Date(),
        });
        setCurrentStepIndex(totalSteps);
        // Pass conversationId from the response (captured when messages were saved on last step)
        onComplete(result.updatedCollectedAnswers || answers, result.conversationId);
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
        let formattedQuestion = formatQuestionForChat(
          convertAPIQuestionToLegacy(result.nextQuestion),
          backendStepIndex,
          totalSteps
        );
        // Customize leads per day question for inbound flow
        // Convert options to proper format (handle both string[] and object[] formats)
        let dynamicOptions: { label: string; value: string; disabled?: boolean }[] | undefined;
        if (result.nextQuestion.options) {
          if (Array.isArray(result.nextQuestion.options) && result.nextQuestion.options.length > 0) {
            if (typeof result.nextQuestion.options[0] === 'string') {
              // Convert string[] to object[]
              dynamicOptions = (result.nextQuestion.options as string[]).map(opt => ({ label: opt, value: opt }));
            } else {
              // Already in correct format
              dynamicOptions = result.nextQuestion.options as { label: string; value: string }[];
            }
          }
        }
        logger.debug('[Dynamic Options] Checking for inbound flow', { 
          hasInboundData: !!inboundLeadData, 
          intentKey: result.nextQuestion.intentKey,
          inboundLeadData 
        });
        if (inboundLeadData && result.nextQuestion.intentKey === 'leads_per_day') {
          // Count total leads across all platforms
          const linkedinCount = inboundLeadData?.linkedinProfiles?.filter(Boolean).length || 0;
          const emailCount = inboundLeadData?.emailIds?.filter(Boolean).length || 0;
          const phoneCount = inboundLeadData?.phoneNumbers?.filter(Boolean).length || 0;
          const totalLeads = Math.max(linkedinCount, emailCount, phoneCount); // Use max as one lead can have multiple contact methods
          logger.debug('[Dynamic Options] Generating dynamic options for inbound', { 
            totalLeads,
            linkedinCount,
            emailCount,
            phoneCount
          });
          // Generate dynamic options based on lead count
          if (totalLeads <= 1) {
            dynamicOptions = [{ label: '1', value: '1' }];
            // Replace the entire question for single lead
            formattedQuestion = `You have **1 lead** uploaded. You'll connect with this lead.`;
          } else if (totalLeads <= 5) {
            const options = [];
            for (let i = 1; i <= totalLeads; i++) {
              options.push({ label: String(i), value: String(i) });
            }
            dynamicOptions = options;
            // Replace the generic question with inbound-specific question
            formattedQuestion = formattedQuestion.replace(
              /How many leads do you want.*\?/i,
              `You have **${totalLeads} leads** uploaded. How many leads do you want to connect with daily?`
            );
          } else if (totalLeads <= 10) {
            dynamicOptions = [
              { label: '1', value: '1' },
              { label: '5', value: '5' },
              { label: String(totalLeads), value: String(totalLeads) }
            ];
            // Replace the generic question with inbound-specific question
            formattedQuestion = formattedQuestion.replace(
              /How many leads do you want.*\?/i,
              `You have **${totalLeads} leads** uploaded. How many leads do you want to connect with daily?`
            );
          } else if (totalLeads <= 25) {
            dynamicOptions = [
              { label: '5', value: '5' },
              { label: '10', value: '10' },
              { label: String(totalLeads), value: String(totalLeads) }
            ];
            // Replace the generic question with inbound-specific question
            formattedQuestion = formattedQuestion.replace(
              /How many leads do you want.*\?/i,
              `You have **${totalLeads} leads** uploaded. How many leads do you want to connect with daily?`
            );
          } else if (totalLeads <= 50) {
            dynamicOptions = [
              { label: '10', value: '10' },
              { label: '25', value: '25' },
              { label: String(totalLeads), value: String(totalLeads) }
            ];
            // Replace the generic question with inbound-specific question
            formattedQuestion = formattedQuestion.replace(
              /How many leads do you want.*\?/i,
              `You have **${totalLeads} leads** uploaded. How many leads do you want to connect with daily?`
            );
          } else {
            // More than 50 leads
            dynamicOptions = [
              { label: '10', value: '10' },
              { label: '25', value: '25' },
              { label: '50', value: '50' },
              { label: 'Max', value: String(totalLeads) }
            ];
            // Replace the generic question with inbound-specific question
            formattedQuestion = formattedQuestion.replace(
              /How many leads do you want.*\?/i,
              `You have **${totalLeads} leads** uploaded. How many leads do you want to connect with daily?`
            );
          }
          logger.debug('[Dynamic Options] Generated options', { dynamicOptions, totalLeads });
        }
        addAIMessage({
          role: 'ai',
          content: formattedQuestion,
          timestamp: new Date(),
          options: dynamicOptions,
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
  /**
   * Start flow with pre-selected platforms (for inbound flow)
   * This starts the ICP flow but with platforms already selected
   */
  const startFlowWithPlatforms = useCallback(async (platforms: string[], inboundData?: any) => {
    // CRITICAL: Use module-level synchronous lock
    if (isStartingFlow) {
      logger.debug('Flow is currently starting - module lock active, skipping');
      return;
    }
    if (isICPFlowStarted) {
      logger.debug('Flow already started - global flag is true, skipping');
      return;
    }
    if (hasStartedRef.current) {
      logger.debug('startFlowWithPlatforms already called, skipping');
      return;
    }
    // Store inbound data if provided
    if (inboundData) {
      logger.debug('[startFlowWithPlatforms] Setting inbound lead data', { 
        inboundData,
        linkedinCount: inboundData?.linkedinProfiles?.filter(Boolean).length,
        emailCount: inboundData?.emailIds?.filter(Boolean).length,
        phoneCount: inboundData?.phoneNumbers?.filter(Boolean).length,
        leadIds: inboundData?.leadIds
      });
      setInboundLeadData(inboundData);
    } else {
      logger.warn('[startFlowWithPlatforms] No inbound data provided!');
    }
    isStartingFlow = true;
    hasStartedRef.current = true;
    setIsICPFlowStarted(true);
    setIsLoading(true);
    setIsProcessingAI(true);
    try {
      // Pre-set the selected platforms
      const platformsAnswer = platforms.join(', ');
      // Build initial answers with selected platforms
      const initialAnswers: Record<string, any> = {
        selected_platforms: platformsAnswer,
      };
      setAnswers(initialAnswers);
      // Call the backend to process platform selection and get the first platform action question
      const response = await processICPAnswer({
        currentStepIndex: 4, // Platform selection step
        userAnswer: platformsAnswer,
        category: 'lead_generation',
        collectedAnswers: initialAnswers,
        currentIntentKey: 'selected_platforms',
      });
      if (!response.success) {
        // If no next question, try fetching from step 5 directly
        logger.debug('processICPAnswer failed, trying fetchICPQuestionByStep');
        const fallbackResponse = await fetchICPQuestionByStep(5, undefined, 'lead_generation');
        if (!fallbackResponse.success || !fallbackResponse.question) {
          throw new Error('Failed to get next question');
        }
        const formattedQuestion = formatQuestionForChat(
          convertAPIQuestionToLegacy(fallbackResponse.question),
          5,
          11
        );
        addAIMessage({
          role: 'ai',
          content: formattedQuestion,
          timestamp: new Date(),
        });
        setCurrentStepIndex(4);
        setQuestions([fallbackResponse.question]);
        setTotalSteps(11);
      } else if (response.nextQuestion) {
        const formattedQuestion = formatQuestionForChat(
          convertAPIQuestionToLegacy(response.nextQuestion),
          response.nextStepIndex || 5,
          response.totalSteps || 11
        );
        addAIMessage({
          role: 'ai',
          content: formattedQuestion,
          timestamp: new Date(),
        });
        // Update state with the returned answers
        if (response.updatedCollectedAnswers) {
          setAnswers(response.updatedCollectedAnswers);
        }
        setCurrentStepIndex(response.nextStepIndex ? response.nextStepIndex - 1 : 4);
        setQuestions([response.nextQuestion]);
        const steps = response.totalSteps || 11;
        setTotalSteps(steps);
      } else {
        throw new Error('No next question returned from backend');
      }
      logger.debug('startFlowWithPlatforms - started with platforms', { 
        platforms, 
        success: true
      });
    } catch (error: any) {
      logger.error('Error starting flow with platforms', error);
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
      setIsICPFlowStarted(false);
      isStartingFlow = false;
    } finally {
      setIsLoading(false);
      setIsProcessingAI(false);
      isStartingFlow = false;
    }
  }, [addAIMessage, setIsProcessingAI, isICPFlowStarted, setIsICPFlowStarted]);
  return {
    startFlow,
    startFlowWithPlatforms,
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
