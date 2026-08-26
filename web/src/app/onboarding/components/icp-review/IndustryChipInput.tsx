'use client';
// R8 Phase 5 - small chip input for industries / countries / titles. The
// review screen wires the same component in three places so the look is
// consistent. Add chips by typing + Enter or pasting comma-separated values.

import * as React from 'react';
import { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface IndustryChipInputProps {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  /** Color for chip background - defaults to LAD navy. */
  tone?: string;
}

export default function IndustryChipInput({
  value, onChange, placeholder = 'Add and press Enter…', suggestions = [], tone,
}: IndustryChipInputProps) {
  const [input, setInput] = useState('');

  const add = (raw: string) => {
    const items = raw
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((v) => !value.includes(v));
    if (items.length === 0) return;
    onChange([...value, ...items]);
    setInput('');
  };

  const remove = (item: string) => onChange(value.filter((v) => v !== item));

  const chipBg = tone ? `${tone}1f` : '#e8ebf7';
  const chipText = tone ?? '#0B1957';

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-[12px] font-medium"
            style={{ background: chipBg, color: chipText }}
          >
            {v}
            <button
              type="button"
              onClick={() => remove(v)}
              className="w-4 h-4 grid place-items-center rounded-full hover:bg-black/10"
              aria-label={`Remove ${v}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {value.length === 0 && (
          <span className="text-[11.5px] text-slate-400 dark:text-[#7a8ba3]/70">No values yet</span>
        )}
      </div>
      <div className="flex gap-1.5">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              if (input.trim()) add(input);
            } else if (e.key === 'Backspace' && !input && value.length) {
              remove(value[value.length - 1]);
            }
          }}
          placeholder={placeholder}
          className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[12.5px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
        />
        <button
          type="button"
          onClick={() => input.trim() && add(input)}
          disabled={!input.trim()}
          className="h-9 px-3 rounded-lg text-[12.5px] font-medium border border-slate-200 dark:border-[#262831] text-[#172560] dark:text-white hover:bg-slate-50 dark:hover:bg-[#1a2a43] disabled:opacity-50 inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      {suggestions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {suggestions
            .filter((s) => !value.includes(s))
            .slice(0, 6)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => add(s)}
                className="px-2 py-0.5 rounded-full text-[11px] font-medium text-slate-600 dark:text-[#7a8ba3] border border-dashed border-slate-300 dark:border-[#262831] hover:bg-slate-50 dark:hover:bg-[#1a2a43]"
              >
                + {s}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
