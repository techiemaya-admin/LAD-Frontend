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
          'relative flex items-end gap-2 px-4 py-3 bg-white border rounded-2xl shadow-sm transition-all',
          isFocused
            ? 'border-gray-400 shadow-md'
            : 'border-gray-200 hover:border-gray-300',
          disabled && 'opacity-60'
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
              className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              title="Workflow Library"
            >
              <Library className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Attach file"
          >
            <Paperclip className="w-4 h-4" />
          </button>
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
        <div className="flex items-center gap-1 mb-1">
          <button
            type="button"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            title="Timer"
          >
            <Clock className="w-4 h-4" />
          </button>
          <button
            type="submit"
            disabled={!input.trim() || disabled}
            className={cn(
              'p-2 rounded-lg transition-colors',
              input.trim() && !disabled
                ? 'bg-gray-900 text-white hover:bg-gray-800'
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