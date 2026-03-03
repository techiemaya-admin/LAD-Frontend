'use client';
import React, { useState } from 'react';
import { Check, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
interface ConditionSelectorProps {
  onSubmit: (selectedValue: string) => void;
  onSkip?: () => void;
}
export default function ConditionSelector({ onSubmit, onSkip }: ConditionSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const conditionOptions = [
    { value: 'No conditions', label: 'No conditions', description: 'Run all actions' },
    { value: 'If connected', label: 'If connected', description: 'LinkedIn connection accepted' },
    { value: 'If opened', label: 'If opened', description: 'Email was opened' },
    { value: 'If replied', label: 'If replied', description: 'Email/WhatsApp reply received' },
    { value: 'If clicked', label: 'If clicked', description: 'Email link was clicked' },
    { value: 'Custom conditions', label: 'Custom conditions', description: 'Define your own condition' },
  ];
  const handleSelect = (value: string) => {
    setSelected(value);
    // Auto-submit for all options
    setTimeout(() => onSubmit(value), 100);
  };
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onSubmit('Skip');
    }
  };
  return (
    <div className="mt-4 space-y-4">
      {/* Condition Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {conditionOptions.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                'relative flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                isSelected
                  ? 'bg-blue-50 border-blue-500 text-blue-900 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              )}
              aria-pressed={isSelected}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Filter className={cn('w-5 h-5', isSelected ? 'text-blue-600' : 'text-gray-400')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
              </div>
              {isSelected && (
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
      {/* Skip Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={handleSkip}
          className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          Skip
        </button>
      </div>
    </div>
  );
}