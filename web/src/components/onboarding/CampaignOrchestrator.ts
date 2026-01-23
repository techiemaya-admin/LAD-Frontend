/**
 * Campaign Orchestrator (MAYA AI)
 * 
 * Frontend-only conversation orchestrator for 7-step ICP & Campaign Setup.
 * Controls WHEN to ask questions, gets WHAT to ask from backend.
 */
import { useState, useCallback, useRef } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import {
  fetchICPQuestionByStep,
  processICPAnswer,
  type ICPQuestion as APIICPQuestion,
  type ICPAnswerResponse,
} from '@/features/ai-icp-assistant';
import { logger } from '@/lib/logger';
export interface CampaignState {
  step: number; // 1-7
  icp_industries: string[];
  icp_locations: string[];
  icp_roles: string[] | null; // null if skipped
  selected_platforms: string[];
  campaign_goal: string;
  leads_per_day: number | null;
  campaign_days: number | null;
  step6_subStep: number; // 0 = leads_per_day, 1 = campaign_days
}
export interface CampaignOrchestratorReturn {
  startFlow: () => Promise<void>;
  handleAnswer: (userInput: string) => Promise<void>;
  handleBack: () => void;
  handleEdit: (stepNumber: number) => Promise<void>;
  reset: () => void;
  currentStep: number;
  isComplete: boolean;
  isLoading: boolean;
  state: CampaignState;
}
/**
 * Hook to manage 7-step campaign onboarding flow
 * Frontend controls flow, backend generates questions
 */
export function useCampaignOrchestrator(
  onComplete: (state: CampaignState) => void,
  onUpdatePreview?: (step: number, answer: any) => void
): CampaignOrchestratorReturn {
  const { addAIMessage, setIsProcessingAI } = useOnboardingStore();
  const [state, setState] = useState<CampaignState>({
    step: 1,
    icp_industries: [],
    icp_locations: [],
    icp_roles: null,
    selected_platforms: [],
    campaign_goal: '',
    leads_per_day: null,
    campaign_days: null,
    step6_subStep: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState<APIICPQuestion | null>(null);
  const hasStartedRef = useRef(false);
  const isComplete = state.step > 7;
  /**
   * Start the flow - get first question from backend
   */
  const startFlow = useCallback(async () => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;
    setIsLoading(true);
    setIsProcessingAI(true);
    try {
      // Get first question from backend
      const response = await fetchICPQuestionByStep(1);
      if (response.success && response.question) {
        setCurrentQuestion(response.question);
        // Show question in chat
        addAIMessage({
          role: 'ai',
          content: response.question.question,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('Error starting flow', error);
      addAIMessage({
        role: 'ai',
        content: 'Error: Could not start campaign setup. Please refresh the page.',
        timestamp: new Date(),
      });
    } finally {
      setIsLoading(false);
      setIsProcessingAI(false);
    }
  }, [addAIMessage, setIsProcessingAI]);
  /**
   * Process user answer and move to next step
   */
  const handleAnswer = useCallback(async (userInput: string) => {
    if (isLoading || isComplete || !currentQuestion) return;
    // Handle special commands
    const inputLower = userInput.toLowerCase().trim();
    if (inputLower === 'back' || inputLower === 'go back') {
      handleBack();
      return;
    }
    if (inputLower.startsWith('edit ')) {
      const stepMatch = inputLower.match(/edit\s+(\d+)/);
      if (stepMatch) {
        const stepNum = parseInt(stepMatch[1], 10);
        if (stepNum >= 1 && stepNum <= 7) {
          await handleEdit(stepNum);
          return;
        }
      }
    }
    if (inputLower === 'skip' && currentQuestion.allowSkip) {
      // Handle skip for optional steps
      await processSkip();
      return;
    }
    setIsLoading(true);
    setIsProcessingAI(true);
    try {
      // Parse and save answer based on current step
      const parsedAnswer = parseAnswerForStep(state.step, userInput, state);
      // Update state
      const newState = updateStateForStep(state, state.step, parsedAnswer);
      setState(newState);
      // Update preview if callback provided
      if (onUpdatePreview) {
        onUpdatePreview(state.step, parsedAnswer);
      }
      // Send to backend for validation and next question
      const response: ICPAnswerResponse = await processICPAnswer({
        currentStepIndex: state.step,
        userAnswer: userInput,
        category: 'lead_generation',
      });
      if (!response.success) {
        throw new Error(response.error || 'Failed to process answer');
      }
      // Handle clarification needed
      if (response.clarificationNeeded) {
        addAIMessage({
          role: 'ai',
          content: response.message || 'Please provide more details.',
          timestamp: new Date(),
        });
        // Re-ask current question
        if (currentQuestion) {
          addAIMessage({
            role: 'ai',
            content: currentQuestion.question,
            timestamp: new Date(),
          });
        }
        setIsLoading(false);
        setIsProcessingAI(false);
        return;
      }
      // Handle completion
      if (response.completed || state.step >= 7) {
        // Generate confirmation step
        await showConfirmationStep(newState);
        setIsLoading(false);
        setIsProcessingAI(false);
        return;
      }
      // Move to next step
      const nextStep = getNextStep(state.step, newState);
      await moveToStep(nextStep, newState);
    } catch (error: any) {
      logger.error('Error processing answer', error);
      addAIMessage({
        role: 'ai',
        content: `Error: ${error.message}. Please try again.`,
        timestamp: new Date(),
      });
      setIsLoading(false);
      setIsProcessingAI(false);
    }
  }, [state, currentQuestion, isLoading, isComplete, addAIMessage, onUpdatePreview, setIsProcessingAI]);
  /**
   * Move to specific step
   */
  const moveToStep = useCallback(async (step: number, currentState: CampaignState) => {
    try {
      // Build context for step 7 (confirmation)
      let context = {};
      if (step === 7) {
        context = {
          icp_industries: currentState.icp_industries,
          icp_locations: currentState.icp_locations,
          icp_roles: currentState.icp_roles || [],
          selected_platforms: currentState.selected_platforms,
          campaign_goal: currentState.campaign_goal,
          leads_per_day: currentState.leads_per_day,
          campaign_days: currentState.campaign_days,
        };
      }
      // Get question from backend
      const contextParam = step === 7 ? encodeURIComponent(JSON.stringify(context)) : undefined;
      const response = await fetchICPQuestionByStep(step, contextParam, 'lead_generation');
      if (response.success && response.question) {
        setCurrentQuestion(response.question);
        setState({ ...currentState, step });
        // Show question in chat
        addAIMessage({
          role: 'ai',
          content: response.question.question,
          timestamp: new Date(),
        });
      }
    } catch (error) {
      logger.error('Error moving to step', error);
    } finally {
      setIsLoading(false);
      setIsProcessingAI(false);
    }
  }, [addAIMessage]);
  /**
   * Show confirmation step (Step 7)
   */
  const showConfirmationStep = useCallback(async (currentState: CampaignState) => {
    const context = {
      icp_industries: currentState.icp_industries,
      icp_locations: currentState.icp_locations,
      icp_roles: currentState.icp_roles || [],
      selected_platforms: currentState.selected_platforms,
      campaign_goal: currentState.campaign_goal,
      leads_per_day: currentState.leads_per_day,
      campaign_days: currentState.campaign_days,
    };
    const response = await fetchICPQuestionByStep(7, encodeURIComponent(JSON.stringify(context)), 'lead_generation');
    if (response.success && response.question) {
      setCurrentQuestion(response.question);
      setState({ ...currentState, step: 7 });
      addAIMessage({
        role: 'ai',
        content: response.question.question,
        timestamp: new Date(),
      });
    }
  }, [addAIMessage]);
  /**
   * Handle back navigation
   */
  const handleBack = useCallback(() => {
    if (state.step <= 1) return;
    const prevStep = state.step - 1;
    // Reset step 6 sub-step if going back from step 6
    const newState = {
      ...state,
      step: prevStep,
      step6_subStep: prevStep === 6 ? 0 : state.step6_subStep,
    };
    setState(newState);
    moveToStep(prevStep, newState);
  }, [state, moveToStep]);
  /**
   * Handle edit - jump to specific step
   */
  const handleEdit = useCallback(async (stepNumber: number) => {
    if (stepNumber < 1 || stepNumber > 7) return;
    const newState = {
      ...state,
      step: stepNumber,
      step6_subStep: stepNumber === 6 ? 0 : state.step6_subStep,
    };
    setState(newState);
    await moveToStep(stepNumber, newState);
  }, [state, moveToStep]);
  /**
   * Handle skip for optional steps
   */
  const processSkip = useCallback(async () => {
    const newState = { ...state };
    if (state.step === 3) {
      newState.icp_roles = null; // Mark as skipped
    } else if (state.step === 4) {
      newState.selected_platforms = [];
    }
    const nextStep = getNextStep(state.step, newState);
    setState({ ...newState, step: nextStep });
    await moveToStep(nextStep, newState);
  }, [state, moveToStep]);
  /**
   * Reset flow
   */
  const reset = useCallback(() => {
    setState({
      step: 1,
      icp_industries: [],
      icp_locations: [],
      icp_roles: null,
      selected_platforms: [],
      campaign_goal: '',
      leads_per_day: null,
      campaign_days: null,
      step6_subStep: 0,
    });
    setCurrentQuestion(null);
    hasStartedRef.current = false;
    setIsLoading(false);
  }, []);
  return {
    startFlow,
    handleAnswer,
    handleBack,
    handleEdit,
    reset,
    currentStep: state.step,
    isComplete,
    isLoading,
    state,
  };
}
/**
 * Parse answer based on current step
 */
function parseAnswerForStep(step: number, userInput: string, currentState: CampaignState): any {
  const input = userInput.trim();
  switch (step) {
    case 1: // ICP Industries
      return input.split(',').map(s => s.trim()).filter(Boolean);
    case 2: // Locations
      return input.split(',').map(s => s.trim()).filter(Boolean);
    case 3: // Decision Makers
      return input.split(',').map(s => s.trim()).filter(Boolean);
    case 4: // Platforms
      const platforms = ['LinkedIn', 'Email', 'WhatsApp', 'Voice Calls'];
      return input.split(',').map(s => {
        const trimmed = s.trim();
        return platforms.find(p => p.toLowerCase() === trimmed.toLowerCase()) || trimmed;
      }).filter(Boolean);
    case 5: // Campaign Goal
      return input;
    case 6: // Campaign Settings
      if (currentState.step6_subStep === 0) {
        // leads_per_day
        const num = parseInt(input, 10);
        return isNaN(num) ? null : num;
      } else {
        // campaign_days
        const num = parseInt(input, 10);
        return isNaN(num) ? null : num;
      }
    case 7: // Confirmation
      return input.toLowerCase();
    default:
      return input;
  }
}
/**
 * Update state based on step and answer
 */
function updateStateForStep(currentState: CampaignState, step: number, answer: any): CampaignState {
  const newState = { ...currentState };
  switch (step) {
    case 1:
      newState.icp_industries = answer;
      break;
    case 2:
      newState.icp_locations = answer;
      break;
    case 3:
      newState.icp_roles = answer;
      break;
    case 4:
      newState.selected_platforms = answer;
      break;
    case 5:
      newState.campaign_goal = answer;
      break;
    case 6:
      if (currentState.step6_subStep === 0) {
        newState.leads_per_day = answer;
        newState.step6_subStep = 1; // Move to next sub-step
      } else {
        newState.campaign_days = answer;
      }
      break;
  }
  return newState;
}
/**
 * Get next step number
 */
function getNextStep(currentStep: number, state: CampaignState): number {
  if (currentStep === 6 && state.step6_subStep === 0) {
    // Still on step 6, first sub-step
    return 6;
  }
  if (currentStep >= 7) {
    return 7; // Completion
  }
  return currentStep + 1;
}