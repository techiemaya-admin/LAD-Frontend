/**
 * Chat Step Controller - Option Handlers
 * 
 * Handles option selection and parsing logic
 */
import { logger } from '@/lib/logger';
import type { ICPQuestion as APIICPQuestion } from '@/features/ai-icp-assistant';
/**
 * Handle option selection and convert to answer format
 */
export async function handleOptionSelection(
  selectedValues: string[],
  currentQuestion: APIICPQuestion | undefined,
  questions: APIICPQuestion[],
  currentStepIndex: number,
  handleAnswer: (answer: string) => Promise<void>
): Promise<void> {
  const latestQuestion = questions[currentStepIndex] || currentQuestion;
  const questionToUse = latestQuestion || currentQuestion;
  const selectedValue = selectedValues[0]; // Single select for campaign settings
  logger.debug('handleOptionSubmit', { intentKey: questionToUse?.intentKey, selectedValues });
  // Check if it's a "Custom" option
  if (selectedValue === 'Custom' && questionToUse?.intentKey === 'leads_per_day') {
    await handleAnswer('Custom');
    return;
  }
  if (selectedValue === 'Custom' && questionToUse?.intentKey === 'campaign_days') {
    await handleAnswer('Custom');
    return;
  }
  // Parse numeric values from options like "10 leads", "25 leads", "50 leads"
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
}