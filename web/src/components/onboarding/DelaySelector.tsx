'use client';

import React, { useState } from 'react';
import { Check, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DelaySelectorProps {
  onSubmit: (selectedValue: string) => void;
  onSkip?: () => void;
  options?: string[]; // Dynamic options from backend
}

export default function DelaySelector({ onSubmit, onSkip, options }: DelaySelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [customDays, setCustomDays] = useState<string>('');

  // Use backend options if provided, otherwise fallback to defaults
  const defaultDelayOptions = [
    { value: 'No delay (run immediately)', label: 'No delay', description: 'Actions run immediately' },
    { value: '1 hour delay', label: '1 hour', description: 'Wait 1 hour between actions' },
    { value: '2 hours delay', label: '2 hours', description: 'Wait 2 hours between actions' },
    { value: '1 day delay', label: '1 day', description: 'Wait 1 day between actions' },
    { value: '2 days delay', label: '2 days', description: 'Wait 2 days between actions' },
    { value: 'Custom delay', label: 'Custom', description: 'Specify your own delay' },
  ];
  
  // Parse backend options to match our format
  const delayOptions = options && options.length > 0
    ? options.map(opt => {
        // Extract label from options like "No delay (run immediately)"
        const match = opt.match(/^([^(]+)(?:\s*\([^)]+\))?$/);
        const label = match ? match[1].trim() : opt;
        
        // Determine description based on label
        let description = '';
        if (opt.toLowerCase().includes('no delay') || opt.toLowerCase().includes('immediately')) {
          description = 'Actions run immediately';
        } else if (opt.toLowerCase().includes('custom')) {
          description = 'Specify your own delay';
        } else {
          const numberMatch = opt.match(/(\d+)\s*(hour|day)s?/i);
          if (numberMatch) {
            const num = numberMatch[1];
            const unit = numberMatch[2].toLowerCase();
            description = `Wait ${num} ${unit}${parseInt(num) > 1 ? 's' : ''} between actions`;
          } else {
            description = '';
          }
        }
        
        return {
          value: opt, // Send full option text to backend
          label,
          description,
        };
      })
    : defaultDelayOptions;

  const handleSelect = (value: string) => {
    setSelected(value);
    if (!value.toLowerCase().includes('custom')) {
      // Auto-submit for non-custom options
      setTimeout(() => {
        onSubmit(value);
      }, 100);
    }
  };

  const handleCustomSubmit = () => {
    if (customDays.trim()) {
      onSubmit(`${customDays} days delay`);
    }
  };


  return (
    <div className="mt-4 space-y-4">
      {/* Delay Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {delayOptions.map((option) => {
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
                <Clock className={cn('w-5 h-5', isSelected ? 'text-blue-600' : 'text-gray-400')} />
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

      {/* Custom Input */}
      {selected === 'Custom' && (
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter delay in days
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              value={customDays}
              onChange={(e) => setCustomDays(e.target.value)}
              placeholder="e.g., 5"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleCustomSubmit}
              disabled={!customDays.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

