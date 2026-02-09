'use client';
import React from 'react';
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
  const cleanContent = (text: string) =>
    text
      .replace(/\\n/g, '\n')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/_(.*?)_/g, '$1')
      .trim();
  // Don't show requirements collection during ICP onboarding - it's handled by the chat flow
  const showRequirements = false; // Disabled: isAI && status === 'need_input' && missing;
  const showSearchResults = isAI && searchResults && searchResults.length > 0;
  // CRITICAL FIX: Detect template input request FIRST (before parsing options)
  // Template questions should take priority over action options
  const contentLower = content.toLowerCase();
  const isTemplateRequest = isAI && isLastMessage && (
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
  return (
    <div
      className={cn(
        'flex gap-3 w-full max-w-4xl mx-auto px-4 py-3',
        isAI ? 'justify-start' : 'justify-end'
      )}
    >
      {isAI && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-white border border-slate-200 overflow-hidden flex items-center justify-center shadow-sm">
            <img
              src="/ai-chat-avatar.png"
              alt="AI"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}
      {/* Message Content */}
      <div className={cn(
        'flex-1 min-w-0 max-w-[85%]',
        isAI ? 'flex flex-col items-start' : 'flex flex-col items-end'
      )}>
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
            {showOptions && parsedOptions
              ? cleanContent(parsedOptions.questionText)
              : cleanContent(content)}
          </div>
        </div>
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
                leadsPerDayOptions={parsedOptions.leadsPerDayOptions}
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
