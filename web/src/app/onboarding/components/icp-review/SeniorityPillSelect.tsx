'use client';
// R8 Phase 5 - multi-select pills for seniority. Reflects Apollo's standard
// seniority levels so the search dispatcher can map directly.

import * as React from 'react';
import { Check } from 'lucide-react';

const LEVELS = [
  { value: 'c_level',   label: 'C-Level' },
  { value: 'vp',        label: 'VP' },
  { value: 'director',  label: 'Director' },
  { value: 'head',      label: 'Head' },
  { value: 'manager',   label: 'Manager' },
  { value: 'senior_ic', label: 'Senior IC' },
  { value: 'ic',        label: 'IC' },
];

interface SeniorityPillSelectProps {
  value: string[];
  onChange: (next: string[]) => void;
}

export default function SeniorityPillSelect({ value, onChange }: SeniorityPillSelectProps) {
  const toggle = (v: string) =>
    onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {LEVELS.map((l) => {
        const on = value.includes(l.value);
        return (
          <button
            key={l.value}
            type="button"
            onClick={() => toggle(l.value)}
            className={`inline-flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-medium transition border ${
              on
                ? 'text-white border-transparent'
                : 'text-slate-600 dark:text-[#7a8ba3] border-slate-200 dark:border-[#262831] hover:bg-slate-50 dark:hover:bg-[#1a2a43]'
            }`}
            style={on ? { background: '#0B1957' } : undefined}
            aria-pressed={on}
          >
            {on && <Check className="w-3 h-3" />}
            {l.label}
          </button>
        );
      })}
    </div>
  );
}
