'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDependentActionsToRemove, getRequiredActionsFromOptions } from '@/lib/actionDependencies';
interface SelectableOptionsProps {
  options: string[];
  multiSelect?: boolean;
  onSubmit: (selectedValues: string[]) => void;
  variant?: 'default' | 'cards' | 'checkboxes'; // Visual style variant
  platformIndex?: number; // For platform actions progress display
  totalPlatforms?: number; // For platform actions progress display
  preSelectedOptions?: string[]; // Pre-selected options (for platform actions)
  platformName?: string; // Platform name for dependency checking (e.g., 'linkedin', 'whatsapp')
  leadsPerDayOptions?: boolean; // Show warning and force single-select for lead volume
}
export default function SelectableOptions({
  options,
  multiSelect = false,
  onSubmit,
  variant = 'default',
  platformIndex,
  totalPlatforms,
  preSelectedOptions = [],
  platformName,
  leadsPerDayOptions = false,
}: SelectableOptionsProps) {
  // Pre-select all options if preSelectedOptions is provided, otherwise start empty
  const [selected, setSelected] = useState<Set<string>>(
    new Set(preSelectedOptions.length > 0 ? preSelectedOptions : [])
  );
  const [showLeadsWarning, setShowLeadsWarning] = useState(false);
  const [customValue, setCustomValue] = useState<string>('');
  // Update workflow in real-time when selections change (for platform actions)
  useEffect(() => {
    const platform = detectPlatform();
    if (platform && variant === 'checkboxes') {
      // This is a platform actions question - update workflow immediately
      const selectedArray = Array.from(selected);
      // Get current ICP answers from global state
      const currentAnswers = (window as any).__icpAnswers || {};
      // Update the platform actions in the answers
      const actionKey = `${platform}_actions`;
      const updatedAnswers = {
        ...currentAnswers,
        [actionKey]: selectedArray,
      };
      // Store updated answers globally
      (window as any).__icpAnswers = updatedAnswers;
      // Trigger workflow update event
      const updateEvent = new CustomEvent('workflowUpdate', {
        detail: { answers: updatedAnswers, stepIndex: (window as any).__currentStepIndex || 0 }
      });
      window.dispatchEvent(updateEvent);
    }
  }, [selected, variant]);
  // Detect if high lead volume is selected (50+ or "max")
  useEffect(() => {
    if (!leadsPerDayOptions) {
      setShowLeadsWarning(false);
      return;
    }
    const selectedValues = Array.from(selected);
    const showWarning = selectedValues.some((value) => {
      const normalized = value.toLowerCase();
      if (normalized === 'max') return true;
      const numericMatch = normalized.match(/(\d+)/);
      return numericMatch ? Number(numericMatch[1]) >= 50 : false;
    });
    setShowLeadsWarning(showWarning);
  }, [selected, leadsPerDayOptions]);
  const hasCustomSelected = Array.from(selected).some(opt => opt.toLowerCase().includes('custom'));

  const handleSubmit = useCallback(() => {
    if (selected.size > 0) {
      if (hasCustomSelected && customValue.trim()) {
        if (multiSelect) {
          const finalValues = Array.from(selected).map(opt =>
            opt.toLowerCase().includes('custom') ? customValue.trim() : opt
          );
          onSubmit(finalValues);
        } else {
          onSubmit([customValue.trim()]);
        }
      } else {
        onSubmit(Array.from(selected));
      }
    }
  }, [selected, hasCustomSelected, customValue, multiSelect, onSubmit]);

  // Handle Enter key to submit
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle Enter if we're not typing in the custom input (the input has its own onKeyDown)
      if (document.activeElement?.tagName !== 'INPUT') {
        const isSubmitDisabled = selected.size === 0 || (hasCustomSelected && !customValue.trim());
        if (event.key === 'Enter' && !isSubmitDisabled) {
          event.preventDefault();
          handleSubmit();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, hasCustomSelected, customValue, handleSubmit]);
  // Detect platform from props or options (for platform actions)
  const detectPlatform = (): string | null => {
    // Use platformName prop if provided
    if (platformName) {
      return platformName.toLowerCase();
    }
    // Fallback: Check if any option contains platform-specific keywords
    const linkedinKeywords = ['connection request', 'linkedin'];
    const whatsappKeywords = ['whatsapp', 'broadcast'];
    const emailKeywords = ['email'];
    const voiceKeywords = ['call', 'voice'];
    for (const option of options) {
      const lower = option.toLowerCase();
      if (linkedinKeywords.some(k => lower.includes(k))) return 'linkedin';
      if (whatsappKeywords.some(k => lower.includes(k))) return 'whatsapp';
      if (emailKeywords.some(k => lower.includes(k))) return 'email';
      if (voiceKeywords.some(k => lower.includes(k))) return 'voice';
    }
    return null;
  };
  const toggleOption = (option: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      const wasSelected = next.has(option);
      if (wasSelected) {
        // Unchecking an option
        next.delete(option);
        // CRITICAL: If this is a required action, automatically remove dependent actions
        const platform = detectPlatform();
        if (platform && variant === 'checkboxes') {
          // This is likely a platform actions question
          const dependentActions = getDependentActionsToRemove(platform, option, options);
          for (const dependentAction of dependentActions) {
            next.delete(dependentAction);
          }
        }
      } else {
        // Checking an option
        if (multiSelect) {
          next.add(option);
          // AUTO-CHECK REQUIRED ACTIONS: If this action requires other actions, auto-check them
          const platform = detectPlatform();
          if (platform && variant === 'checkboxes') {
            const requiredActions = getRequiredActionsFromOptions(platform, option, options);
            for (const requiredAction of requiredActions) {
              if (!next.has(requiredAction)) {
                next.add(requiredAction);
              }
            }
          }
        } else {
          // Single select - replace selection
          next.clear();
          next.add(option);
        }
      }
      return next;
    });
  };
  // Platform progress indicator
  const showProgress = platformIndex !== undefined && totalPlatforms !== undefined;
  // Render based on variant
  const renderOptions = () => {
    if (variant === 'cards') {
      // Card style for platforms (larger, more visual)
      return (
        <div className="grid grid-cols-2 gap-3">
          {options.map((option) => {
            const isSelected = selected.has(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={cn(
                  'relative flex flex-col items-center justify-center px-6 py-5 rounded-xl border-2 transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-[#172560] focus:ring-offset-2',
                  isSelected
                    ? 'bg-[#172560]/5 border-[#172560] text-[#172560] shadow-md scale-105'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-[#172560]/50 hover:bg-[#172560]/5 hover:shadow-sm'
                )}
                aria-pressed={isSelected}
              >
                <span className="font-semibold text-base mb-1">{option}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-[#172560] flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      );
    } else if (variant === 'checkboxes') {
      // Checkbox style for actions (more compact)
      return (
        <div className="space-y-2">
          {options.map((option) => {
            const isSelected = selected.has(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left',
                  'focus:outline-none focus:ring-2 focus:ring-[#172560] focus:ring-offset-2',
                  isSelected
                    ? 'bg-[#172560]/5 border-[#172560] text-[#172560]'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                )}
                aria-pressed={isSelected}
              >
                <div className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                  isSelected
                    ? 'bg-[#172560] border-[#172560]'
                    : 'border-gray-300 bg-white'
                )}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="font-medium text-sm flex-1">{option}</span>
              </button>
            );
          })}
        </div>
      );
    } else {
      // Default style (sleek full-width buttons to ensure consistent sizing and no overlap)
      return (
        <div className="flex flex-col w-full gap-2">
          {options.map((option) => {
            const isSelected = selected.has(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={cn(
                  'relative flex items-center justify-between w-full px-4 py-3 rounded-xl border transition-all duration-200 text-left shadow-sm',
                  'focus:outline-none focus:ring-2 focus:ring-[#172560] focus:ring-offset-2 hover:-translate-y-0.5',
                  isSelected
                    ? 'bg-[#172560] border-[#172560] text-white shadow-md shadow-[#172560]/20'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-[#172560]/50 hover:text-[#172560]'
                )}
                aria-pressed={isSelected}
              >
                <span className="font-medium text-[14px] leading-snug pr-4">{option}</span>
                {isSelected && (
                  <div className="flex-shrink-0 ml-2">
                    <Check className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      );
    }
  };
  return (
    <div className="mt-4 space-y-3">
      {/* Progress Indicator for Platform Actions */}
      {showProgress && (
        <div className="text-sm font-medium text-gray-600 mb-2">
          Platform {platformIndex} of {totalPlatforms}
        </div>
      )}
      {/* Options */}
      {renderOptions()}
      {/* Custom Input Box */}
      {hasCustomSelected && (
        <div className="mt-3 animate-in fade-in slide-in-from-top-2">
          <input
            type="text"
            className="w-full px-4 py-3 bg-white text-gray-900 rounded-xl border-2 border-[#172560]/40 focus:outline-none focus:ring-2 focus:ring-[#172560] focus:border-[#172560] shadow-sm transition-all"
            placeholder={
              Array.from(selected).some(opt => opt.toLowerCase().includes('days'))
                ? "e.g., Monday, Wednesday"
                : "Enter your custom value here..."
            }
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customValue.trim()) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            autoFocus
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex pt-3 w-full">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selected.size === 0 || (hasCustomSelected && !customValue.trim())}
          className={cn(
            'w-full px-6 py-3 rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#172560] focus:ring-offset-2',
            (selected.size > 0 && !(hasCustomSelected && !customValue.trim()))
              ? 'bg-[#172560] text-white hover:bg-[#0f1840] shadow-md hover:shadow-lg'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed opacity-70'
          )}
        >
          Continue
        </button>
      </div>
      {/* Leads Per Day Warning */}
      {showLeadsWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          If your LinkedIn account is a free account, it's better to continue with 25 leads per day.
        </div>
      )}
    </div>
  );
}
