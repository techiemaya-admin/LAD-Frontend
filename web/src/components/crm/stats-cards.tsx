'use client';
// Four CRM stat cards that drive the view switch on the CRM page:
// All Contacts · Prospects · Leads · Clients. Clicking the active card
// toggles back to the kanban board view.

import * as React from 'react';
import { Users, Sparkles, TrendingUp, BadgeCheck, type LucideIcon } from 'lucide-react';

export type CrmView = 'board' | 'all' | 'prospects' | 'leads' | 'clients';

interface StatCard {
  key: Exclude<CrmView, 'board'>;
  title: string;
  /** `null` = could not be loaded; renders "—". Matches `StatsCardsProps.counts`,
   *  which has always been nullable — typing this `number` made every one of the
   *  four assignments below a type error. */
  value: number | null;
  Icon: LucideIcon;
  bg: string;
  ic: string;
}

export interface StatsCardsProps {
  /**
   * `null` for a figure we could not load — NOT the same as a tenant that has
   * none. During an outage these all rendered `0`, which told a tenant with 571
   * contacts that their CRM was empty.
   */
  counts: {
    all: number | null;
    prospects: number | null;
    leads: number | null;
    clients: number | null;
  };
  selected: CrmView;
  onSelect: (key: Exclude<CrmView, 'board'>) => void;
}

export default function StatsCards({ counts, selected, onSelect }: StatsCardsProps) {
  const cards: StatCard[] = [
    { key: 'all',       title: 'All Contacts', value: counts.all,       Icon: Users,       bg: 'bg-blue-100 dark:bg-[#172560]',        ic: 'text-[#0B1957] dark:text-blue-200' },
    { key: 'prospects', title: 'Prospects',    value: counts.prospects, Icon: Sparkles,    bg: 'bg-indigo-100 dark:bg-indigo-950/40',  ic: 'text-[#0B1957] dark:text-indigo-200' },
    { key: 'leads',     title: 'Leads',        value: counts.leads,     Icon: TrendingUp,  bg: 'bg-sky-100 dark:bg-sky-950/40',        ic: 'text-sky-700 dark:text-sky-200' },
    { key: 'clients',   title: 'Clients',      value: counts.clients,   Icon: BadgeCheck,  bg: 'bg-emerald-50 dark:bg-emerald-950/40', ic: 'text-emerald-600' },
  ];

  return (
    <div className="flex gap-3 sm:gap-4 mb-5 flex-wrap items-stretch">
      {cards.map((c) => {
        const isSel = selected === c.key;
        const Icon = c.Icon;
        return (
          <div key={c.key} className="w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
            <button
              onClick={() => onSelect(c.key)}
              className={`bg-white dark:bg-[#071131] rounded-[20px] border w-full text-left flex flex-col h-full min-h-[120px] transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                isSel
                  ? 'border-[#0b1957] dark:border-[#2563eb] ring-2 ring-[#0b1957]/30'
                  : 'border-slate-200 dark:border-blue-950/40'
              }`}
            >
              <div className="flex-1 flex flex-col p-4">
                <div className="flex justify-end mb-2">
                  <div className={`${c.bg} w-12 h-12 rounded-full grid place-items-center`}>
                    <Icon className={`w-6 h-6 ${c.ic}`} />
                  </div>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <p className="text-[10px] sm:text-[12.5px] text-slate-500 dark:text-slate-400 mb-1">{c.title}</p>
                  <h5
                    className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums"
                    style={{ fontFamily: '"Space Grotesk", system-ui' }}
                  >
                    {c.value}
                  </h5>
                </div>
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}
