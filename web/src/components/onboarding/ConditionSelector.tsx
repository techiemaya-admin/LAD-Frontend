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
  const [customCondition, setCustomCondition] = useState<string>('');
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
    // Auto-submit for non-custom options
    if (!value.toLowerCase().includes('custom')) {
      setTimeout(() => onSubmit(value), 100);
    }
  };

  const handleCustomSubmit = () => {
    if (customCondition.trim()) {
      onSubmit(`If ${customCondition}`);
    }
  };
  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onSubmit('Skip');
    }
  };
  return (
    <div className="mt-4 space-y-4 w-full">
      {/* Condition Options */}
      <div className="flex flex-col w-full gap-2">
        {conditionOptions.map((option) => {
          const isSelected = selected === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                'relative flex items-start gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-left',
                'focus:outline-none focus:ring-2 focus:ring-[#172560] focus:ring-offset-2',
                isSelected
                  ? 'bg-[#172560]/5 border-[#172560] text-[#172560] shadow-sm'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-[#172560]/40 hover:bg-[#172560]/5'
              )}
              aria-pressed={isSelected}
            >
              <div className="flex-shrink-0 mt-0.5">
                <Filter className={cn('w-5 h-5', isSelected ? 'text-[#172560]' : 'text-gray-400')} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm">{option.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
              </div>
              {isSelected && (
                <div className="flex-shrink-0">
                  <div className="w-5 h-5 rounded-full bg-[#172560] flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Input */}
      {selected?.toLowerCase().includes('custom') && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 animate-in fade-in slide-in-from-top-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe your custom condition (e.g., "Replied positively")
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center bg-white border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#172560] focus-within:border-transparent">
              <span className="px-3 text-gray-500 font-medium border-r border-gray-300 bg-gray-50">If</span>
              <input
                type="text"
                value={customCondition}
                onChange={(e) => setCustomCondition(e.target.value)}
                placeholder="e.g., booked a meeting"
                className="flex-1 px-3 py-2 border-none focus:outline-none focus:ring-0"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customCondition.trim()) {
                    e.preventDefault();
                    handleCustomSubmit();
                  }
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={!customCondition.trim()}
              className="px-4 py-2 bg-[#172560] text-white rounded-lg font-medium hover:bg-[#0f1840] transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto mt-2 sm:mt-0"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {/* Skip Button */}
      {!selected && (
        <div className="flex w-full pt-2">
          <button
            type="button"
            onClick={handleSkip}
            className="w-full px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 hover:text-gray-900 font-medium transition-colors"
          >
            Skip configuring conditions
          </button>
        </div>
      )}
    </div>
  );
}
