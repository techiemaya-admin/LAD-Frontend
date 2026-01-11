'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface TemplateInputProps {
  onSubmit: (template: string) => void;
  placeholder?: string;
  label?: string;
}

export default function TemplateInput({
  onSubmit,
  placeholder = 'Paste your message template here...',
  label = 'Message Template',
}: TemplateInputProps) {
  const [template, setTemplate] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (template.trim()) {
      onSubmit(template.trim());
      setTemplate('');
    }
  };

  return (
    <div className="mt-4 space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      
      <div className="relative">
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && e.shiftKey === false) {
              e.preventDefault();
              if (template.trim()) {
                handleSubmit();
              }
            }
          }}
          placeholder={placeholder}
          rows={4}
          className={cn(
            'w-full px-4 py-3 rounded-xl border-2 transition-all resize-none',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            isFocused
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-gray-200 bg-white hover:border-gray-300',
            'text-sm text-gray-900 placeholder:text-gray-400'
          )}
        />
        <div className="mt-1 text-xs text-gray-500">
          Press Enter to submit, Shift+Enter for new line
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!template.trim()}
          className={cn(
            'w-full px-4 py-2.5 rounded-xl font-medium transition-colors',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            template.trim()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          Continue
        </button>
      </div>
      <div className="text-xs text-gray-500 text-center mt-1">
        Template is required. Please provide your message template.
      </div>
    </div>
  );
}

