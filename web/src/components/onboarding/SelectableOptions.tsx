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
}: SelectableOptionsProps) {
  // Pre-select all options if preSelectedOptions is provided, otherwise start empty
  const [selected, setSelected] = useState<Set<string>>(
    new Set(preSelectedOptions.length > 0 ? preSelectedOptions : [])
  );
  
  // State for connection message template
  const [connectionMessage, setConnectionMessage] = useState<string>(
    "Hi {{first_name}}, I'd like to connect..."
  );
  const [showMessageInput, setShowMessageInput] = useState<boolean>(false);
  
  // State for dependency warning
  const [dependencyWarning, setDependencyWarning] = useState<string>('');
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
          // AUTO-CHECK REQUIRED ACTIONS: If this action requires other actions, auto-check them
          const platform = detectPlatform();
          let autoCheckedRequiredActions: string[] = [];
          if (platform && variant === 'checkboxes') {
            const requiredActions = getRequiredActionsFromOptions(platform, option, options);
            for (const requiredAction of requiredActions) {
              // Check if the required action OR its variants are already selected
              const isConnectionRequest = requiredAction.toLowerCase().includes('connection request');
              const hasConnectionVariant = isConnectionRequest && (
                next.has('Send connection request (with message)') ||
                next.has('Send connection request (without message)')
              );
              
              if (!next.has(requiredAction) && !hasConnectionVariant) {
                // For connection request, add the "without message" variant by default
                if (isConnectionRequest) {
                  next.add('Send connection request (without message)');
                  autoCheckedRequiredActions.push('Send connection request');
                } else {
                  next.add(requiredAction);
                  autoCheckedRequiredActions.push(requiredAction);
                }
              }
            }
          }
          
          // Add the option
          next.add(option);
          
          // IMMEDIATELY open template modal for template-requiring actions
          const requiresTemplate = 
            option.toLowerCase().includes('with message') ||
            option.toLowerCase().includes('after accepted') ||
            option.toLowerCase().includes('send message') ||
            option.toLowerCase().includes('send email') ||
            option.toLowerCase().includes('send broadcast');
          
          if (requiresTemplate && platform && variant === 'checkboxes') {
            // Trigger modal to open immediately via workflow panel
            // Small delay to ensure state update completes first
            setTimeout(() => {
              // Update workflow with current selections
              const currentAnswers = (window as any).__icpAnswers || {};
              const actionKey = `${platform}_actions`;
              const updatedAnswers = {
                ...currentAnswers,
                [actionKey]: Array.from(next),
              };
              (window as any).__icpAnswers = updatedAnswers;
              
              // Trigger workflow update which will create the step
              const updateEvent = new CustomEvent('workflowUpdate', { 
                detail: { 
                  answers: updatedAnswers, 
                  stepIndex: (window as any).__currentStepIndex || 0,
                  openTemplateModal: true // Signal to open modal
                } 
              });
              window.dispatchEvent(updateEvent);
            }, 100);
          }
          
          // Show warning if we auto-checked required actions
          if (autoCheckedRequiredActions.length > 0) {
            const requiredActionNames = autoCheckedRequiredActions.join(', ');
            setDependencyWarning(`⚠️ "${option}" requires "${requiredActionNames}" - automatically selected both!`);
            // Clear warning after 5 seconds
            setTimeout(() => setDependencyWarning(''), 5000);
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
  
  const handleSubmit = useCallback(() => {
    if (selected.size > 0) {
      onSubmit(Array.from(selected));
    }
  }, [selected, onSubmit]);

  // Handle Enter key to submit
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && selected.size > 0) {
        event.preventDefault();
        handleSubmit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selected, handleSubmit]);

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
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  isSelected
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-md scale-105'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm'
                )}
                aria-pressed={isSelected}
              >
                <span className="font-semibold text-base mb-1">{option}</span>
                {isSelected && (
                  <div className="absolute top-2 right-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
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
      // Filter out "Follow profile", connection request sub-options, and "Send message (after accepted)"
      const filteredOptions = options.filter(opt => 
        !opt.toLowerCase().includes('follow profile') &&
        !(opt.toLowerCase().includes('connection request') && 
          (opt.toLowerCase().includes('with message') || opt.toLowerCase().includes('without message'))) &&
        !opt.toLowerCase().includes('send message (after accepted)') // Hide this action
      );
      
      // Check if we have any connection request option
      const hasConnectionOption = options.some(opt => 
        opt.toLowerCase().includes('connection request') || opt.toLowerCase().includes('send connection')
      );
      
      // Add "Send connection request" as a single option if it exists in any form
      const connectionRequestOption = 'Send connection request';
      const displayOptions = hasConnectionOption 
        ? filteredOptions.filter(opt => !opt.toLowerCase().includes('send connection request'))
            .concat([connectionRequestOption])
        : filteredOptions;
      
      // Sort options in correct order: Visit profile → Send connection request → Send message
      const sortedOptions = displayOptions.sort((a, b) => {
        const order = ['visit profile', 'send connection', 'send message'];
        const indexA = order.findIndex(key => a.toLowerCase().includes(key));
        const indexB = order.findIndex(key => b.toLowerCase().includes(key));
        return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
      });
      
      // Check if connection request is selected
      const isConnectionRequestSelected = selected.has(connectionRequestOption) || 
        Array.from(selected).some(s => s.toLowerCase().includes('connection request'));
      
      // Checkbox style for actions (more compact)
      return (
        <div className="space-y-2">
          {sortedOptions.map((option, index) => {
            const isConnectionRequest = option === connectionRequestOption;
            // For connection request, check if either variant is selected
            const isSelected = isConnectionRequest 
              ? (selected.has('Send connection request (with message)') || 
                 selected.has('Send connection request (without message)') ||
                 selected.has(option))
              : selected.has(option);
            
            return (
              <React.Fragment key={option}>
                <button
                  type="button"
                  onClick={() => {
                    if (isConnectionRequest) {
                      // For connection request, handle specially
                      const newSelected = new Set(selected);
                      if (isSelected) {
                        // Unchecking - remove both variants AND dependent actions
                        newSelected.delete(option);
                        newSelected.delete('Send connection request (with message)');
                        newSelected.delete('Send connection request (without message)');
                        setShowMessageInput(false);
                        
                        // CRITICAL: Remove dependent actions (e.g., "Send message (after accepted)")
                        const platform = detectPlatform();
                        if (platform && variant === 'checkboxes') {
                          const dependentActions = getDependentActionsToRemove(platform, option, options);
                          for (const dependentAction of dependentActions) {
                            newSelected.delete(dependentAction);
                          }
                        }
                      } else {
                        // Checking - default to "without message"
                        newSelected.add('Send connection request (without message)');
                        setShowMessageInput(false);
                      }
                      setSelected(newSelected);
                    } else {
                      // Normal toggle for other options
                      toggleOption(option);
                    }
                  }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all duration-200 text-left',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    isSelected
                      ? 'bg-blue-50 border-blue-500 text-blue-900'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  )}
                  aria-pressed={isSelected}
                >
                  <div className={cn(
                    'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0',
                    isSelected
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 bg-white'
                  )}>
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <span className="font-medium text-sm flex-1">{option}</span>
                </button>
                
                {/* Show sub-options for connection request */}
                {option === connectionRequestOption && isSelected && (
                  <div className="ml-8 space-y-2">
                    {/* Radio buttons for with/without message */}
                    <div className="flex gap-2">
                      {/* With message option */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMessageInput(true);
                          // Update selection to include "with message" indicator
                          const newSelected = new Set(selected);
                          // Remove both variants
                          newSelected.delete(connectionRequestOption);
                          newSelected.delete('Send connection request (without message)');
                          // Add only "with message"
                          newSelected.add('Send connection request (with message)');
                          setSelected(newSelected);
                          
                          // IMMEDIATELY open template modal for connection message
                          const platform = detectPlatform();
                          if (platform) {
                            setTimeout(() => {
                              // Update workflow with current selections
                              const currentAnswers = (window as any).__icpAnswers || {};
                              const actionKey = `${platform}_actions`;
                              const updatedAnswers = {
                                ...currentAnswers,
                                [actionKey]: Array.from(newSelected),
                              };
                              (window as any).__icpAnswers = updatedAnswers;
                              
                              // Trigger workflow update with immediate modal open signal
                              const updateEvent = new CustomEvent('workflowUpdate', { 
                                detail: { 
                                  answers: updatedAnswers, 
                                  stepIndex: (window as any).__currentStepIndex || 0,
                                  openTemplateModal: true // Signal to open modal NOW
                                } 
                              });
                              window.dispatchEvent(updateEvent);
                            }, 100);
                          }
                        }}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200',
                          'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1',
                          showMessageInput
                            ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                        )}
                      >
                        <div className={cn(
                          'w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          showMessageInput
                            ? 'border-white'
                            : 'border-gray-400'
                        )}>
                          {showMessageInput && 
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          }
                        </div>
n                        <span className="text-xs font-medium">With message</span>
                      </button>

                      {/* Without message option (default) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMessageInput(false);
                          // Update selection to include "without message" indicator
                          const newSelected = new Set(selected);
                          // Remove both variants  
                          newSelected.delete(connectionRequestOption);
                          newSelected.delete('Send connection request (with message)');
                          // Add only "without message"
                          newSelected.add('Send connection request (without message)');
                          setSelected(newSelected);
                        }}
                        className={cn(
                          'flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border-2 transition-all duration-200',
                          'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1',
                          !showMessageInput
                            ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                            : 'bg-white border-gray-300 text-gray-700 hover:border-blue-300 hover:bg-blue-50'
                        )}
                      >
                        <div className={cn(
                          'w-3 h-3 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                          !showMessageInput
                            ? 'border-white'
                            : 'border-gray-400'
                        )}>
                          {!showMessageInput && 
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          }
                        </div>
                        <span className="text-xs font-medium">Without message</span>
                      </button>
                    </div>
                    
                    <p className="text-xs text-gray-500 italic mt-1">
                      {showMessageInput ? 'Message editor will open after clicking Continue' : 'No message will be sent'}
                    </p>
                  </div>
                )}
              </React.Fragment>
            );
          })}
          
        </div>
      );
    } else {
      // Default style (original)
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {options.map((option) => {
            const isSelected = selected.has(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => toggleOption(option)}
                className={cn(
                  'relative flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  isSelected
                    ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                    : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                )}
                aria-pressed={isSelected}
              >
                <span className="font-medium text-sm">{option}</span>
                {isSelected && (
                  <div className="flex-shrink-0 ml-2">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
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
      
      {/* Dependency Warning */}
      {dependencyWarning && (
        <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-300 rounded-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-amber-800 font-medium">{dependencyWarning}</p>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={selected.size === 0}
          className={cn(
            'flex-1 px-4 py-2.5 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            selected.size > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
