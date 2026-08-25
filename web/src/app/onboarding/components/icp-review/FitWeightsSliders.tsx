'use client';
// R8 Phase 5 - six sliders for the fit_weights block. Used to bias the fit
// scorer toward whichever signals matter most for this tenant.

import * as React from 'react';
import type { IcpStructured } from '@lad/frontend-features/ai-icp-assistant';

type FitWeights = NonNullable<IcpStructured['fit_weights']>;

const ROWS: Array<{ key: keyof FitWeights; label: string; hint: string }> = [
  { key: 'industry_match',   label: 'Industry',   hint: 'Match company industry to ICP' },
  { key: 'size_match',       label: 'Company size', hint: 'Match employee count band' },
  { key: 'seniority_match',  label: 'Seniority',  hint: 'Match person seniority' },
  { key: 'title_match',      label: 'Job title',  hint: 'Match exact job-title keywords' },
  { key: 'geo_match',        label: 'Geography',  hint: 'Match country / region' },
  { key: 'tech_stack_match', label: 'Tech stack', hint: 'Tooling / platform signals' },
];

interface FitWeightsSlidersProps {
  value: FitWeights;
  onChange: (next: FitWeights) => void;
}

export default function FitWeightsSliders({ value, onChange }: FitWeightsSlidersProps) {
  const update = (key: keyof FitWeights, n: number) => {
    onChange({ ...value, [key]: Math.max(0, Math.min(1, n)) });
  };
  return (
    <div className="space-y-3">
      {ROWS.map((r) => {
        const v = Math.round(((value[r.key] ?? 0) as number) * 100);
        return (
          <div key={r.key} className="grid grid-cols-[140px_1fr_56px] gap-3 items-center">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[#172560] dark:text-white">{r.label}</p>
              <p className="text-[10.5px] text-slate-500 dark:text-[#7a8ba3] truncate">{r.hint}</p>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={v}
              onChange={(e) => update(r.key, Number(e.target.value) / 100)}
              className="w-full accent-[#0B1957]"
              aria-label={`${r.label} weight`}
            />
            <span className="text-[12px] tabular-nums font-semibold text-[#172560] dark:text-white text-right">
              {v}
            </span>
          </div>
        );
      })}
    </div>
  );
}
