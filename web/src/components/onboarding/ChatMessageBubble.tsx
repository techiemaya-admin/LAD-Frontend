'use client';
import React, { useEffect, useMemo, useState } from 'react';
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
import { apiGet } from '@/lib/api';

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
  const fullText = useMemo(() => cleanContent(content), [content]);
  const shouldAnimate = isAI && isLastMessage;
  const [typedText, setTypedText] = useState(() =>
    shouldAnimate ? '' : fullText
  );
  const [isTyping, setIsTyping] = useState(() =>
    shouldAnimate && fullText.length > 0
  );
  useEffect(() => {
    if (!shouldAnimate) {
      setTypedText(fullText);
      setIsTyping(false);
      return;
    }
    if (!fullText) {
      setTypedText('');
      setIsTyping(false);
      return;
    }
    setIsTyping(true);
    setTypedText('');
    let index = 0;
    const interval = setInterval(() => {
      index += 2;
      const nextText = fullText.slice(0, index);
      setTypedText(nextText);
      if (index >= fullText.length) {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, 12);
    return () => clearInterval(interval);
  }, [fullText, shouldAnimate]);
  useEffect(() => {
    if (!isAI || !isLastMessage) return;
    window.dispatchEvent(
      new CustomEvent('aiTyping', { detail: { isTyping } })
    );
  }, [isAI, isLastMessage, isTyping]);

  const [dynamicOptions, setDynamicOptions] = useState<string[] | null>(null);
  const [hasExhaustedLimit, setHasExhaustedLimit] = useState(false);

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
  const isLeadsPerDay = parsedOptions?.leadsPerDayOptions;

  useEffect(() => {
    if (isLeadsPerDay && isLastMessage) {
      apiGet<{ success: boolean; totalDailyLimit?: number | string; remainingDailyLimit?: number | string }>('/api/campaigns/linkedin/limits')
        .then((res) => {
          let limit = 25; // default
          if (res && res.success) {
            // Use the remaining limit since they have consumed connections already today
            const valToUse = res.remainingDailyLimit !== undefined ? res.remainingDailyLimit : res.totalDailyLimit;
            if (valToUse !== undefined && valToUse !== null) {
              limit = parseInt(String(valToUse), 10);
              if (isNaN(limit)) limit = 25;
            }
          }

          const dynamicOpts: string[] = [];
          if (limit <= 0) {
            setHasExhaustedLimit(true);
            dynamicOpts.push('0 (Limit exhausted today)');
          } else {
            setHasExhaustedLimit(false);
            // Generate increments of 5 up to the limit
            for (let i = 5; i < limit; i += 5) {
              dynamicOpts.push(String(i));
            }
            // Always add the exact limit at the end
            dynamicOpts.push(String(limit));
          }
          // Ensure options are unique and sorted numerically (except for text labels)
          const uniqueSortedOpts = Array.from(new Set(dynamicOpts)).sort((a, b) => {
            if (a.includes('Max')) return 1;
            if (b.includes('Max')) return -1;
            if (a.includes('0')) return -1;
            if (b.includes('0')) return 1;
            return parseInt(a, 10) - parseInt(b, 10);
          });
          setDynamicOptions(uniqueSortedOpts);
        })
        .catch(err => {
          logger.error('[ChatMessageBubble] Error fetching limits:', err);
          setDynamicOptions(['10 (Recommended)', '25', 'Max (50)']);
        });
    }
  }, [isLeadsPerDay, isLastMessage]);

  const showOptions = parsedOptions !== null && onOptionSubmit !== undefined && !isTyping && (!isLeadsPerDay || dynamicOptions !== null);
  const finalOptions = (isLeadsPerDay && dynamicOptions) ? dynamicOptions : parsedOptions?.options;

  return (
    <div
      className={cn(
        'flex gap-3 w-full max-w-4xl mx-auto px-4 py-3',
        isAI ? 'justify-start' : 'justify-end'
      )}
    >
      {isAI && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#172560]/10 border border-[#172560]/20 flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4 text-[#172560]" />
          </div>
        </div>
      )}
      {/* Message Content */}
      <div className={cn(
        'flex-1 min-w-0 max-w-[85%]',
        isAI ? 'flex flex-col items-start' : 'flex flex-col items-end'
      )}>
        <div className={cn(
          'px-5 py-3.5 shadow-sm',
          isAI
            ? 'bg-white border border-gray-100 rounded-2xl rounded-tl-[4px]'
            : 'bg-[#172560] text-white rounded-2xl rounded-tr-[4px]'
        )}>
          <div className={cn(
            'whitespace-pre-wrap leading-relaxed text-[15px]',
            isAI ? 'text-gray-800' : 'text-white'
          )}>
            {showOptions && parsedOptions ? parsedOptions.questionText : typedText}
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
                options={finalOptions || []}
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
                platformName={parsedOptions.platformName}
                leadsPerDayOptions={parsedOptions.leadsPerDayOptions}
              />
            )}

            {hasExhaustedLimit && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm">
                <p className="font-semibold mb-1 text-amber-900">⚠️ Daily Limit Reached</p>
                <p>If you want to create a new campaign, first stop all current running campaigns and create a new one tomorrow, or add a new LinkedIn account to create a new campaign today.</p>
              </div>
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
