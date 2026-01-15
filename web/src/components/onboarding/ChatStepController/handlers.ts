/**
 * Chat Step Controller - Answer Handlers
 * 
 * Handles answer processing and validation logic
 */

import { logger } from '@/lib/logger';
import { useOnboardingStore } from '@/store/onboardingStore';
import {
  processICPAnswer,
  type ICPQuestion as APIICPQuestion,
  type ICPAnswerResponse,
} from '@/features/ai-icp-assistant';
import {
  parseAnswer,
  validateAnswer,
  convertAPIQuestionToLegacy,
} from '@/lib/icpQuestionsConfig';

/**
 * Process user answer and get next step
 */
export async function processAnswer(
  userInput: string,
  currentQuestion: APIICPQuestion,
  currentStepIndex: number,
  answers: Record<string, any>,
  questions: APIICPQuestion[],
  totalSteps: number,
  onUpdatePreview?: (stepIndex: number, answer: any) => void
): Promise<{
  success: boolean;
  nextStepIndex?: number | null;
  nextQuestion?: APIICPQuestion;
  updatedCollectedAnswers?: Record<string, any>;
  clarificationNeeded?: boolean;
  completed?: boolean;
  message?: string;
  error?: string;
}> {
  const { addAIMessage, setIsProcessingAI } = useOnboardingStore.getState();

  // Validate userInput is a string
  if (!userInput || typeof userInput !== 'string') {
    addAIMessage({
      role: 'ai',
      content: 'Please provide a valid answer.',
      timestamp: new Date(),
    });
    return { success: false, error: 'Invalid input' };
  }

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
      return { success: false, error: 'Validation failed' };
    }
    
    // Get the most up-to-date question from the questions array
    const latestQuestion = questions[currentStepIndex] || currentQuestion;
    const intentKeyToUse = latestQuestion?.intentKey || currentQuestion?.intentKey;
    
    logger.debug('Storing answer with intentKey', { intentKey: intentKeyToUse });
    
    // Store answer
    const newAnswers = {
      ...answers,
      [intentKeyToUse]: parsedAnswer,
    };
    
    // Debug current answers
    logger.debug('Updated answers and step index', { answers: newAnswers, currentStepIndex });
    
    // Expose current answers globally for progressive workflow updates
    (window as any).__icpAnswers = newAnswers;
    (window as any).__currentStepIndex = currentStepIndex;
    
    // Immediately trigger progressive workflow update
    try {
      const { generateProgressiveWorkflowPreview } = await import('@/lib/workflowGenerator');
      const workflowSteps = generateProgressiveWorkflowPreview(newAnswers, currentStepIndex);
      logger.debug('Generated progressive workflow', { workflowSteps });
      
      // Update workflow preview in store
      useOnboardingStore.getState().setWorkflowPreview(workflowSteps);
    } catch (err) {
      logger.error('Error generating progressive workflow', err);
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
    const allCollectedAnswers = {
      ...answers,
      [intentKeyToUse]: parsedAnswer,
    };
    
    // Call API to process answer and get next step (Gemini decides)
    const apiStepIndex = currentStepIndex + 1; // API uses 1-based indexing
    
    logger.debug('Calling processICPAnswer', { 
      apiStepIndex, 
      currentStepIndex, 
      intentKey: intentKeyToUse, 
      userInput,
      latestQuestion,
      currentQuestion
    });
    
    // Handle platform completion tracking
    const completedPlatforms = getCompletedPlatforms(allCollectedAnswers);
    
    // Handle delay platform tracking
    const completedDelayPlatforms = getCompletedDelayPlatforms(allCollectedAnswers, intentKeyToUse);
    
    const payloadCollectedAnswers = {
      ...allCollectedAnswers,
      completed_platform_actions: completedPlatforms,
      completed_delay_platforms: completedDelayPlatforms
    };

    const response: ICPAnswerResponse = await processICPAnswer({
      currentStepIndex: apiStepIndex,
      userAnswer: userInput,
      category: 'lead_generation',
      collectedAnswers: payloadCollectedAnswers,
      currentIntentKey: intentKeyToUse,
    });
    
    logger.debug('Received processICPAnswer response', { 
      success: response.success, 
      nextStepIndex: response.nextStepIndex, 
      hasQuestion: !!response.nextQuestion,
      correctedAnswer: response.correctedAnswer 
    });

    if (!response.success) {
      return { success: false, error: response.error || 'Failed to process answer' };
    }

    return {
      success: true,
      nextStepIndex: response.nextStepIndex,
      nextQuestion: response.nextQuestion || undefined,
      updatedCollectedAnswers: response.updatedCollectedAnswers,
      clarificationNeeded: response.clarificationNeeded,
      completed: response.completed,
      message: response.message,
      correctedAnswer: response.correctedAnswer || null,
    };
  } catch (error: any) {
    logger.error('Error processing answer', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get completed platforms based on actions and templates
 */
function getCompletedPlatforms(allCollectedAnswers: Record<string, any>): string[] {
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
    return false;
  };

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
      return !needsTemplate || hasTemplate;
    }
    return true;
  });

  // Add platforms that have actions and (no template needed OR template provided) but aren't in completed yet
  ['linkedin', 'whatsapp', 'email', 'voice'].forEach((p) => {
    const actionsKey = `${p}_actions`;
    const templateKey = `${p}_template`;
    const hasActions = allCollectedAnswers[actionsKey] !== undefined && String(allCollectedAnswers[actionsKey]).trim() !== '';
    const hasTemplate = allCollectedAnswers[templateKey] !== undefined;
    
    if (!completedPlatforms.includes(p) && hasActions) {
      const needsTemplate = actionRequiresTemplate(p, String(allCollectedAnswers[actionsKey] || ''));
      if (!needsTemplate || hasTemplate) {
        completedPlatforms.push(p);
      }
    }
  });

  return completedPlatforms;
}

/**
 * Get completed delay platforms based on delay configuration
 */
function getCompletedDelayPlatforms(allCollectedAnswers: Record<string, any>, currentIntentKey: string): string[] {
  let completedDelayPlatforms: string[] = Array.isArray(allCollectedAnswers.completed_delay_platforms)
    ? [...allCollectedAnswers.completed_delay_platforms]
    : [];

  // Check if current answer is a platform-specific delay (e.g., linkedin_delay)
  if (currentIntentKey && currentIntentKey.endsWith('_delay')) {
    const platformName = currentIntentKey.replace('_delay', '');
    
    // Add this platform to completed delays if not already there
    if (!completedDelayPlatforms.includes(platformName)) {
      completedDelayPlatforms.push(platformName);
      logger.debug('Added platform to completed delays', { platformName, completedDelayPlatforms });
    }
  }

  return completedDelayPlatforms;
}
