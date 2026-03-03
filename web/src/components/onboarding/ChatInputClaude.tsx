'use client';
import React, { useState, useEffect, KeyboardEvent, useRef } from 'react';
import { Send, Paperclip, Settings, Clock, Library } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';
interface ChatInputClaudeProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  onShowWorkflowLibrary?: () => void;
}
export default function ChatInputClaude({
  onSend,
  disabled = false,
  placeholder = 'How can I help you today?',
  onShowWorkflowLibrary,
}: ChatInputClaudeProps) {
  const [input, setInput] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Debug: Log when component renders
  useEffect(() => {
    logger.debug('Component rendered', { disabled, placeholder, inputLength: input.length });
  }, [disabled, placeholder, input.length]);
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = '24px';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) {
      logger.warn('Submit blocked - input is disabled');
      return;
    }
    const trimmedInput = input.trim();
    logger.debug('handleSubmit called', { trimmedInput, disabled, canSend: trimmedInput && !disabled });
    if (trimmedInput) {
      onSend(trimmedInput);
      setInput('');
      if (textareaRef.current) {
        textareaRef.current.style.height = '24px';
      }
    } else {
      logger.warn('Cannot send - input is empty');
    }
  };
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Allow all keys to work normally when disabled
    if (disabled) {
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };
  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-3xl mx-auto"
      onClick={(e) => {
        // Ensure clicking the form focuses the textarea
        if (textareaRef.current && !disabled) {
          textareaRef.current.focus();
        }
      }}
    >
      <div
        className={cn(
          'relative flex items-center justify-center gap-3 px-6 py-3 border transition-all rounded-[32px]',
          isFocused
            ? 'border-[#172560]/40 shadow-md bg-white ring-2 ring-[#172560]/20'
            : 'border-gray-300 hover:border-gray-400 bg-white shadow-[0_4px_14px_rgba(0,0,0,0.03)]',
          disabled && 'opacity-60 bg-gray-50'
        )}
        style={{ zIndex: 1 }}
      >
        {/* Left Icons */}
        <div className="flex items-center gap-1 mb-1">
          {onShowWorkflowLibrary && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onShowWorkflowLibrary();
              }}
              className="p-1.5 text-[#172560] hover:text-[#0f1840] hover:bg-[#172560]/5 rounded-lg transition-colors"
              title="Workflow Library"
            >
              <Library className="w-4 h-4" />
            </button>
          )}
        </div>
        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            // Always allow onChange - disabled attribute will handle visual state
            const newValue = e.target.value;
            logger.debug('onChange', {
              value: newValue,
              disabled,
              valueLength: newValue.length,
              canUpdate: !disabled
            });
            setInput(newValue);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            logger.debug('onFocus', { disabled });
            setIsFocused(true);
          }}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className={cn(
            "flex-1 resize-none border-0 outline-none bg-transparent text-gray-900 placeholder:text-gray-400 text-base leading-6 min-h-[24px] max-h-[200px] overflow-y-auto",
            disabled && "cursor-not-allowed opacity-50"
          )}
          style={{
            scrollbarWidth: 'thin',
          }}
          tabIndex={disabled ? -1 : 0}
        />
        {/* Right Icons */}
        <div className="flex items-center gap-1">

          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className={cn(
              'p-2.5 rounded-full transition-colors ml-1 flex items-center justify-center',
              input.trim() && !disabled
                ? 'bg-[#172560] text-white hover:bg-[#0f1840] shadow-md hover:shadow-lg hover:-translate-y-0.5 transform transition-all'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            )}
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </form>
  );
}
