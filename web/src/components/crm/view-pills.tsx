'use client';
// View switcher pill - sits below the stats cards and lets the user jump
// directly between Board / All / Prospects / Leads / Clients without going
// through the stat cards.

import * as React from 'react';
import { Kanban, Users, Sparkles, TrendingUp, BadgeCheck, type LucideIcon } from 'lucide-react';
import type { CrmView } from './stats-cards';

interface PillDef {
  k: CrmView;
  label: string;
  Icon: LucideIcon;
}

const PILLS: PillDef[] = [
  { k: 'board',     label: 'Board',     Icon: Kanban },
  { k: 'all',       label: 'All',       Icon: Users },
  { k: 'prospects', label: 'Prospects', Icon: Sparkles },
  { k: 'leads',     label: 'Leads',     Icon: TrendingUp },
  { k: 'clients',   label: 'Clients',   Icon: BadgeCheck },
];

export interface ViewPillsProps {
  view: CrmView;
  onChange: (next: CrmView) => void;
}

export default function ViewPills({ view, onChange }: ViewPillsProps) {
  return (
    <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-300">
          View
        </span>
        <div className="flex items-center gap-1 rounded-full p-0.5 border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724]">
          {PILLS.map((v) => {
            const Icon = v.Icon;
            const active = view === v.k;
            return (
              <button
                key={v.k}
                onClick={() => onChange(v.k)}
                className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium inline-flex items-center gap-1 ${
                  active
                    ? 'text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a2a43]'
                }`}
                style={active ? { background: '#0B1957' } : undefined}
              >
                <Icon className="w-3 h-3" /> {v.label}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-[12px] text-slate-500 dark:text-slate-300">
        Click any row to open the contact&apos;s profile
      </p>
    </div>
  );
}
