'use client';
// R8 Phase 5 - discovery backends toggle. Updates the search_strategy
// `discovery_order` array + each backend's `enabled` flag consistently so the
// dispatcher sees one source of truth.

import * as React from 'react';
import { BriefcaseBusiness, Sparkles, Building2, type LucideIcon } from 'lucide-react';
import type { SearchStrategy, DiscoveryBackend } from '@lad/frontend-features/ai-icp-assistant';

interface BackendDef {
  key: DiscoveryBackend;
  label: string;
  hint: string;
  Icon: LucideIcon;
}

const BACKENDS: BackendDef[] = [
  { key: 'apollo',          label: 'Apollo',          hint: 'Broad recall · $/result',       Icon: Sparkles },
  { key: 'sales_navigator', label: 'Sales Navigator', hint: 'Title precision · LinkedIn',    Icon: BriefcaseBusiness },
  { key: 'abm',             label: 'ABM',             hint: 'For named target accounts',     Icon: Building2 },
];

interface DiscoveryBackendsToggleProps {
  strategy: SearchStrategy | undefined;
  onChange: (next: SearchStrategy) => void;
}

export default function DiscoveryBackendsToggle({ strategy, onChange }: DiscoveryBackendsToggleProps) {
  const enabled = (k: DiscoveryBackend): boolean => {
    // If no strategy is set yet, default to all backends ON so the search
    // dispatcher has the widest reach. Tenant can disable in this same panel.
    if (!strategy) return true;
    const block = strategy[k] as { enabled?: boolean } | undefined;
    return !!block?.enabled;
  };

  const toggle = (k: DiscoveryBackend) => {
    const wasOn = enabled(k);
    // Fallback base reflects the "all on by default" intent - otherwise
    // toggling one backend would accidentally drop the others that were only
    // virtually enabled via the `if (!strategy) return true` fallback above.
    const base: SearchStrategy = strategy ?? {
      discovery_order: ['apollo', 'sales_navigator', 'abm'],
      apollo:          { enabled: true, max_results_per_run: 500 },
      sales_navigator: { enabled: true, max_results_per_run: 200 },
      abm:             { enabled: true, target_accounts: [] },
    };
    const nextBlock = { ...(base[k] || {}), enabled: !wasOn };
    const next: SearchStrategy = { ...base, [k]: nextBlock };
    // Keep discovery_order in sync - include exactly the enabled backends, in
    // the existing order; append newly-enabled ones at the end.
    const previousOrder = base.discovery_order ?? [];
    const enabledNow = BACKENDS.map((b) => b.key).filter((bk) => {
      if (bk === k) return !wasOn;
      const block = base[bk] as { enabled?: boolean } | undefined;
      return !!block?.enabled;
    });
    const ordered = [
      ...previousOrder.filter((bk) => enabledNow.includes(bk)),
      ...enabledNow.filter((bk) => !previousOrder.includes(bk)),
    ];
    next.discovery_order = ordered.length ? ordered : ['apollo'];
    onChange(next);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {BACKENDS.map((b) => {
        const on = enabled(b.key);
        const Icon = b.Icon;
        return (
          <label
            key={b.key}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition ${
              on
                ? 'border-[#0B1957] bg-[#f1f3fb] dark:bg-[#0e1a3a]'
                : 'border-slate-200 dark:border-[#262831] hover:border-[#0B1957]/40'
            }`}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={() => toggle(b.key)}
              className="mt-1 rounded border-slate-300 dark:border-[#262831] focus:ring-[#0B1957]/30"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5" style={{ color: '#0B1957' }} />
                <p className="text-[13px] font-semibold text-[#172560] dark:text-white">{b.label}</p>
              </div>
              <p className="text-[11.5px] text-slate-500 dark:text-[#7a8ba3] mt-0.5">{b.hint}</p>
            </div>
          </label>
        );
      })}
    </div>
  );
}
