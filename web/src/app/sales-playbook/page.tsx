'use client';

import { useState } from 'react';
import { ClipboardList, Users } from 'lucide-react';
import CallSheet from '@/components/sales-playbook/CallSheet';
import SavedCalls from '@/components/sales-playbook/SavedCalls';
import { ALL_QUESTIONS, PHASES, TOTAL_BUDGET_SECONDS } from '@/components/sales-playbook/script';

export default function SalesPlaybookPage() {
  const [tab, setTab] = useState<'call' | 'saved'>('call');

  const tabs = [
    { id: 'call' as const, label: 'Run a call', icon: ClipboardList },
    { id: 'saved' as const, label: 'Saved calls', icon: Users },
  ];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 py-6 sm:px-6">
      <header className="mb-5 flex flex-wrap items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sales Playbook</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            The discovery script, scored the same way every time — {PHASES.length} phases,{' '}
            {ALL_QUESTIONS.length} questions, about {Math.round(TOTAL_BUDGET_SECONDS / 60)} minutes.
          </p>
        </div>
        <div className="ml-auto flex gap-0.5 rounded-lg bg-muted p-1">
          {tabs.map(t => (
            <button
              key={t.id} type="button" onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                tab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>
      </header>

      {tab === 'call' ? <CallSheet onSaved={() => setTab('saved')} /> : <SavedCalls />}
    </div>
  );
}
