'use client';
// Linear step indicator for the signup wizard. Highlights current step,
// fades completed ones, lets the user click back to any prior step.

import * as React from 'react';
import { Check } from 'lucide-react';
import { WIZARD_STEPS, indexOfStep, type WizardStepId } from './types';

interface WizardStepperProps {
  current: WizardStepId;
  onJump?: (id: WizardStepId) => void;
}

export default function WizardStepper({ current, onJump }: WizardStepperProps) {
  const currentIdx = indexOfStep(current);
  return (
    <ol className="flex items-center justify-between gap-2 max-w-3xl mx-auto px-4 py-4">
      {WIZARD_STEPS.map((s, i) => {
        const status = i < currentIdx ? 'done' : i === currentIdx ? 'current' : 'upcoming';
        const interactive = !!onJump && i <= currentIdx;
        return (
          <li key={s.id} className="flex items-center flex-1 min-w-0 last:flex-initial">
            <button
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onJump?.(s.id)}
              className="flex items-center gap-2 min-w-0 disabled:cursor-default"
              aria-current={status === 'current' ? 'step' : undefined}
            >
              <span
                className={`shrink-0 w-7 h-7 rounded-full grid place-items-center text-[12px] font-semibold transition
                  ${status === 'done'    ? 'bg-[#0B1957] text-white' : ''}
                  ${status === 'current' ? 'bg-white ring-2 ring-[#0B1957] text-[#0B1957]' : ''}
                  ${status === 'upcoming' ? 'bg-slate-100 text-slate-400 dark:bg-[#1a2a43] dark:text-[#7a8ba3]' : ''}
                `}
              >
                {status === 'done' ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <div className="hidden sm:block min-w-0 text-left">
                <p
                  className={`text-[12.5px] font-medium truncate ${
                    status === 'upcoming'
                      ? 'text-slate-400 dark:text-[#7a8ba3]'
                      : 'text-[#172560] dark:text-white'
                  }`}
                  style={{ fontFamily: '"Space Grotesk", system-ui' }}
                >
                  {s.label}
                </p>
                {s.hint && (
                  <p className="text-[10.5px] text-slate-400 dark:text-[#7a8ba3]/70 truncate">{s.hint}</p>
                )}
              </div>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <div
                className={`h-px flex-1 mx-2 ${
                  i < currentIdx ? 'bg-[#0B1957]/40' : 'bg-slate-200 dark:bg-[#262831]'
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
