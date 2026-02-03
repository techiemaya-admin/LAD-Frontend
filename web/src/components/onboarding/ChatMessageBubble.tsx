'use client';
import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Bot, User } from 'lucide-react';
import RequirementsCollection from './RequirementsCollection';
import SearchResultsCards from './SearchResultsCards';
import SelectableOptions from './SelectableOptions';
import DelaySelector from './DelaySelector';
import ConditionSelector from './ConditionSelector';
import TemplateInput from './TemplateInput';
import { parseMessageOptions } from '@/lib/parseMessageOptions';
import { logger } from '@/lib/logger';
interface ChatMessageBubbleProps {
  role: 'ai' | 'user';
  content: string;
  timestamp?: Date | string;
  status?: 'need_input' | 'ready';
  missing?: Record<string, boolean> | string[];
  workflow?: any[];
  searchResults?: any[];
  onRequirementsComplete?: (data: Record<string, any>) => void;
  onOptionSubmit?: (selectedValues: string[]) => void;
  isLastMessage?: boolean;
  options?: Array<{ label: string; value: string }>; // Clickable options from backend
}
export default function ChatMessageBubble({
  role,
  content,
  timestamp,
  status,
  missing,
  workflow,
  searchResults,
  onRequirementsComplete,
  onOptionSubmit,
  isLastMessage = false,
  options: propsOptions,
}: ChatMessageBubbleProps) {
  const isAI = role === 'ai';
  // Don't show requirements collection during ICP onboarding - it's handled by the chat flow
  const showRequirements = false; // Disabled: isAI && status === 'need_input' && missing;
  const showSearchResults = isAI && searchResults && searchResults.length > 0;
  // CRITICAL FIX: Detect template input request FIRST (before parsing options)
  // Template questions should take priority over action options
  const contentLower = content.toLowerCase();
  // DISABLED: Template requests are now handled in workflow panel modal, not inline
  // Skip template request detection for LinkedIn/platform actions
  const isTemplateRequest = false && isAI && isLastMessage && (
    contentLower.includes('please provide the message template') ||
    contentLower.includes('please provide the call script') ||
    contentLower.includes('provide the message template') ||
    contentLower.includes('provide the call script') ||
    contentLower.includes('please write the message') ||
    contentLower.includes('write the message') ||
    contentLower.includes('please provide the message') ||
    contentLower.includes('provide the broadcast message template') ||
    contentLower.includes('provide the whatsapp message template') ||
    contentLower.includes('provide the follow-up message template') ||
    (contentLower.includes('template') && (contentLower.includes('you\'d like to use') || contentLower.includes('please write') || contentLower.includes('please provide') || contentLower.includes('will be sent') || contentLower.includes('that will be sent'))) ||
    (contentLower.includes('script') && (contentLower.includes('you\'d like to use') || contentLower.includes('please write') || contentLower.includes('please provide'))) ||
    (contentLower.includes('message') && contentLower.includes('will be sent') && (contentLower.includes('template') || contentLower.includes('after accepted'))) ||
    // CRITICAL: If message says "You selected X actions" followed by "Please provide template", it's a template question
    (contentLower.includes('you selected') && contentLower.includes('actions') && (contentLower.includes('please provide') || contentLower.includes('provide the') || contentLower.includes('template')))
  );
  // Parse options from message content (only for last AI message and NOT a template request)
  // If it's a template request, don't parse options even if they exist in the message
  const parsedOptions = isAI && isLastMessage && !isTemplateRequest ? parseMessageOptions(content) : null;
  const showOptions = parsedOptions !== null && onOptionSubmit !== undefined;
  
  // Track if this is a platform actions message
  if (showOptions && parsedOptions?.stepType === 'platform_actions' && isLastMessage) {
    (window as any).__lastMessageWasPlatformActions = true;
  } else if (isLastMessage && !showOptions) {
    (window as any).__lastMessageWasPlatformActions = false;
  }

  // Track if there are active options questions (for template modal auto-open logic)
  // Set flag when options are showing, clear when no options
  if (showOptions && isLastMessage) {
    (window as any).__hasActiveOptionsQuestion = true;
  } else if (isLastMessage && !showOptions) {
    (window as any).__hasActiveOptionsQuestion = false;
  }

  // Clean content for display - remove literal \n, remove ** and * markdown, remove pre-selection mentions
  const cleanContent = (text: string) => {
    return text
      .replace(/\\r\\n/g, ' ')  // Remove literal \r\n (Windows line endings)
      .replace(/\\n/g, ' ')     // Remove literal \n strings (backslash + n)
      .replace(/\\r/g, ' ')     // Remove literal \r
      .replace(/\n/g, ' ')      // Remove actual newlines
      .replace(/\r/g, ' ')      // Remove actual carriage returns
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove ** markdown, keep content
      .replace(/\*(.*?)\*/g, '$1')    // Remove single * markdown, keep content
      // Remove pre-selection mentions (but not platform selection text)
      .replace(/All LinkedIn actions are pre-selected\.\s*/gi, '')
      .replace(/All actions are pre-selected\.\s*/gi, '')
      .replace(/\(All actions are pre-selected.*?\)/gi, '')
      .replace(/You can uncheck any actions you don't want:\s*/gi, '')
      .replace(/Modify your selection as needed\.\s*/gi, '')
      .replace(/Uncheck any you want to remove\.\s*/gi, '')
      // Remove "Follow profile" option from text (we don't support it)
      .replace(/•\s*Follow\s+profile\s*/gi, '')
      // Remove empty parentheses left over from cleaning
      .replace(/\(\s*\)/g, '')
      // Don't remove "You can select one or more" from platform selection
      // .replace(/You can select one or more\.\s*/gi, '')
      .replace(/\s+/g, ' ')  // Collapse multiple spaces
      .trim();
  };

  // Get cleaned question text for display
  const displayQuestionText = showOptions && parsedOptions
    ? cleanContent(parsedOptions.questionText || '')
    : '';

  // Check if this is a duplicate question (already answered earlier in the flow)
  // Get previously answered ICP data from window storage
  const icpAnswers = (window as any).__icpAnswers || {};
  const isDuplicateIndustryQuestion = 
    (contentLower.includes('found your industry') || contentLower.includes('select the correct industry')) &&
    icpAnswers.industry && 
    icpAnswers.industry.length > 0;
  
  const isDuplicateLocationQuestion = 
    (contentLower.includes('found your location') || contentLower.includes('select the correct location')) &&
    icpAnswers.location && 
    icpAnswers.location.length > 0;

  const isDuplicateRoleQuestion = 
    (contentLower.includes('found your target role') || contentLower.includes('select the correct decision maker')) &&
    icpAnswers.jobTitle && 
    icpAnswers.jobTitle.length > 0;

  const isDuplicateQuestion = isDuplicateIndustryQuestion || isDuplicateLocationQuestion || isDuplicateRoleQuestion;

  // Check if this is a message that should be hidden
  // IMPORTANT: Be VERY specific to avoid hiding delay questions or other legitimate questions
  const isHiddenTemplateRequest = 
    // CRITICAL: Must NOT be a delay question (delay questions have "Options:" with selectable choices)
    !contentLower.includes('delay') && 
    !contentLower.includes('options:') && // Check for "Options:" to avoid hiding questions with selectable options
    (
      // Template request for messages - explicit template input requests
      (contentLower.includes('please write the message') && contentLower.includes('template')) ||
      (contentLower.includes('please provide the message template')) ||
      (contentLower.includes('provide the message template')) ||
      (contentLower.includes('provide your message template')) ||
      (contentLower.includes('message that will be sent after') && contentLower.includes('template')) ||
      (contentLower.includes('you selected') && contentLower.includes('message') && contentLower.includes('template') && contentLower.includes('provide')) ||
      // Template request for connection messages  
      (contentLower.includes('connection') && contentLower.includes('message') && contentLower.includes('template') && contentLower.includes('provide')) ||
      (contentLower.includes('write') && contentLower.includes('template') && (contentLower.includes('message') || contentLower.includes('connection')))
    );
  
  // Check if this is an outdated pre-selection message
  // IMPORTANT: Only hide if it's a pure text message with NO selectable options
  // If it has options (LinkedIn actions, etc.), it should show
  const isPreSelectionMessage = false; // Disabled - let messages with options show through
  
  // Don't hide delay questions - they should show after platform actions are selected
  const isEarlyDelayQuestion = false;
  
  // Auto-answer hidden template requests to keep the flow moving
  const hasAutoAnswered = useRef(false);
  useEffect(() => {
    if (isHiddenTemplateRequest && isLastMessage && onOptionSubmit && !hasAutoAnswered.current) {
      hasAutoAnswered.current = true;
      // Send a placeholder template - will be replaced by user in workflow modal
      const placeholderTemplate = "Hi {{first_name}}, I'd like to connect with you.";
      logger.debug('Auto-answering template request to continue flow', { content: contentLower });
      // Small delay to ensure backend is ready
      setTimeout(() => {
        onOptionSubmit([placeholderTemplate]);
      }, 100);
    }
  }, [isHiddenTemplateRequest, isLastMessage, onOptionSubmit, contentLower]);

  // Auto-answer duplicate questions with previously stored answers
  const hasDuplicateAutoAnswered = useRef(false);
  useEffect(() => {
    if (isDuplicateQuestion && isLastMessage && onOptionSubmit && !hasDuplicateAutoAnswered.current) {
      hasDuplicateAutoAnswered.current = true;
      
      // Determine which answer to send based on question type
      let answer: string[] = [];
      if (isDuplicateIndustryQuestion && icpAnswers.industry) {
        answer = [icpAnswers.industry];
        logger.debug('Auto-answering duplicate industry question', { answer: icpAnswers.industry });
      } else if (isDuplicateLocationQuestion && icpAnswers.location) {
        answer = [icpAnswers.location];
        logger.debug('Auto-answering duplicate location question', { answer: icpAnswers.location });
      } else if (isDuplicateRoleQuestion && icpAnswers.jobTitle) {
        answer = [icpAnswers.jobTitle];
        logger.debug('Auto-answering duplicate role question', { answer: icpAnswers.jobTitle });
      }
      
      // Send the stored answer
      if (answer.length > 0) {
        setTimeout(() => {
          onOptionSubmit(answer);
        }, 100);
      }
    }
  }, [isDuplicateQuestion, isDuplicateIndustryQuestion, isDuplicateLocationQuestion, isDuplicateRoleQuestion, isLastMessage, onOptionSubmit, icpAnswers]);

  // Check if this message should be completely hidden
  const shouldHideMessage = isHiddenTemplateRequest || isPreSelectionMessage || isEarlyDelayQuestion || isDuplicateQuestion;
  
  // If message should be completely hidden, return null early
  if (shouldHideMessage) {
    return null;
  }
  
  // Determine if we should show the message bubble (not the options, just the text bubble)
  const shouldShowBubble = !showOptions || (displayQuestionText && displayQuestionText.length > 0);

  // If there's no bubble content and no options, don't render anything
  if (!shouldShowBubble && !showOptions) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex gap-3 w-full max-w-4xl mx-auto px-4 py-3',
        isAI ? 'justify-start' : 'justify-end'
      )}
    >
      {isAI && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-white" />
          </div>
        </div>
      )}
      {/* Message Content */}
      <div className={cn(
        'flex-1 min-w-0 max-w-[85%]',
        isAI ? 'flex flex-col items-start' : 'flex flex-col items-end'
      )}>
        {/* Only show message bubble if there's content to display */}
        {shouldShowBubble && (
          <div className={cn(
            'rounded-2xl px-4 py-3 shadow-sm',
            isAI
              ? 'bg-white border border-gray-200'
              : 'bg-blue-600 text-white'
          )}>
            <div className={cn(
              'whitespace-pre-wrap leading-relaxed text-sm',
              isAI ? 'text-gray-900' : 'text-white'
            )}>
              {showOptions ? displayQuestionText : cleanContent(content)}
            </div>
          </div>
        )}
        {/* Selectable Options - Render based on step type */}
        {showOptions && parsedOptions && (
          <div className="mt-3 w-full">
            {parsedOptions.stepType === 'delay' ? (
              <DelaySelector
                onSubmit={(value) => {
                  if (onOptionSubmit) {
                    onOptionSubmit([value]);
                  } else {
                    console.error('[ChatMessageBubble] onOptionSubmit is undefined!');
                  }
                }}
                options={parsedOptions.options}
              />
            ) : parsedOptions.stepType === 'condition' ? (
              <ConditionSelector
                onSubmit={(value) => onOptionSubmit!([value])}
              />
            ) : (
              <SelectableOptions
                options={parsedOptions.options}
                multiSelect={parsedOptions.multiSelect}
                onSubmit={onOptionSubmit!}
                variant={
                  parsedOptions.stepType === 'platform_selection' ? 'cards' :
                    parsedOptions.stepType === 'platform_actions' ? 'checkboxes' :
                      'default'
                }
                platformIndex={parsedOptions.platformIndex}
                totalPlatforms={parsedOptions.totalPlatforms}
                preSelectedOptions={parsedOptions.preSelectedOptions}
                platformName={parsedOptions.platformName} // Pass platform name for dependency checking
              />
            )}
          </div>
        )}
        {/* Template Input */}
        {isTemplateRequest && onOptionSubmit && (
          <div className="mt-3 w-full">
            <TemplateInput
              onSubmit={(template) => onOptionSubmit([template])}
              placeholder="Paste your message template here..."
              label="Message Template"
            />
          </div>
        )}
        {/* Requirements Collection Component */}
        {showRequirements && onRequirementsComplete && missing && (
          <div className="mt-4">
            <RequirementsCollection
              requirements={missing}
              message={content}
              workflow={workflow}
              onComplete={onRequirementsComplete}
            />
          </div>
        )}
        {/* Search Results Cards */}
        {showSearchResults && (
          <div className="mt-4">
            <SearchResultsCards
              results={searchResults}
              onCompanyClick={(company) => {
                logger.debug('Company clicked', { company });
                // Handle company click - could open details, add to workflow, etc.
              }}
            />
          </div>
        )}
        {timestamp && (
          <div className={cn(
            'mt-1.5 text-xs',
            isAI ? 'text-gray-400' : 'text-gray-500'
          )}>
            {(timestamp instanceof Date ? timestamp : new Date(timestamp)).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
      </div>
      {!isAI && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center shadow-sm">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      )}
    </div>
  );
}
