/**
 * SearchStrategyEditor - pure controlled form for the SearchStrategy block of
 * an IcpDefinition. No data fetching, no persistence - the parent feeds in
 * the current value, applies the user's edits via `onChange`, and chooses
 * when to save.
 *
 * Maps 1:1 to SearchStrategy in @lad/frontend-features/ai-icp-assistant/types.ts
 * and the dispatcher's resolveStrategy() defaults in
 * LAD_backend/features/ai-icp-assistant/services/searchAdapters/_utils.js.
 */
'use client';

import { useMemo } from 'react';

import type {
  DiscoveryBackend,
  SearchStrategy,
} from '@lad/frontend-features/ai-icp-assistant';

import { TargetAccountsEditor, type TargetAccount } from './TargetAccountsEditor';

const ALL_BACKENDS: DiscoveryBackend[] = ['apollo', 'sales_navigator', 'abm'];

const BACKEND_LABEL: Record<DiscoveryBackend, string> = {
  apollo: 'Apollo',
  sales_navigator: 'Sales Navigator',
  abm: 'ABM (named accounts)',
};

const BACKEND_DESCRIPTION: Record<DiscoveryBackend, string> = {
  apollo:
    'Apollo.io people search. Strong firmographics, broad coverage, pay-per-result.',
  sales_navigator:
    'LinkedIn Sales Navigator via Unipile. Authoritative job-title data; emails not exposed (filled later by enrichment).',
  abm:
    'Account-based: discover people only at the company list defined below. Use when sales has named the target accounts.',
};

const CROSS_BACKEND_MERGE_OPTIONS: Array<{
  value: NonNullable<NonNullable<SearchStrategy['deduplication']>['cross_backend_merge']>;
  label: string;
  hint: string;
}> = [
  {
    value: 'highest_confidence',
    label: 'Highest confidence',
    hint: 'Keep the backend that reports the strongest match confidence.',
  },
  {
    value: 'first_match',
    label: 'First match wins',
    hint: 'Honour discovery order - keep whichever backend surfaced the candidate first.',
  },
  {
    value: 'merge_fields',
    label: 'Merge fields',
    hint: 'Field-level merge with backend-specific overrides (e.g. Sales Nav job titles win).',
  },
];

export interface SearchStrategyEditorProps {
  value: SearchStrategy;
  onChange: (next: SearchStrategy) => void;
  disabled?: boolean;
}

export function SearchStrategyEditor({
  value,
  onChange,
  disabled = false,
}: SearchStrategyEditorProps) {
  // Order resolution: the discovery_order array is the source of truth, but it
  // may omit a backend the tenant disabled. Show all 3 with toggles, and let
  // the user move enabled ones up/down within discovery_order.
  const order = useMemo(() => {
    const declared = value.discovery_order || [];
    const seen = new Set(declared);
    // Append any backend that wasn't in discovery_order so the editor still
    // surfaces it (the user can then enable + reorder).
    const tail = ALL_BACKENDS.filter((b) => !seen.has(b));
    return [...declared, ...tail];
  }, [value.discovery_order]);

  const set = (patch: Partial<SearchStrategy>) => onChange({ ...value, ...patch });

  const toggleBackend = (b: DiscoveryBackend, enabled: boolean) => {
    set({ [b]: { ...(value[b] || {}), enabled } } as Partial<SearchStrategy>);
  };

  const setBackendCap = (b: DiscoveryBackend, max: number) => {
    set({
      [b]: { ...(value[b] || { enabled: true }), max_results_per_run: max },
    } as Partial<SearchStrategy>);
  };

  const moveBackend = (b: DiscoveryBackend, direction: -1 | 1) => {
    const idx = order.indexOf(b);
    if (idx < 0) return;
    const target = idx + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[idx], next[target]] = [next[target], next[idx]];
    set({ discovery_order: next });
  };

  const fb = value.fallback_rules || {};
  const dd = value.deduplication || {};

  return (
    <div className="space-y-6">
      {/* ── Backends + order ────────────────────────────────────────────── */}
      <section className="rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800">
        <header className="border-b border-gray-200 dark:border-[#262831] px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Backends &amp; discovery order
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            The dispatcher tries enabled backends top-to-bottom. Disabled
            backends are skipped entirely.
          </p>
        </header>
        <ul className="divide-y divide-gray-100 dark:divide-[#262831]">
          {order.map((b, idx) => {
            const cfg = value[b] || {};
            const enabled = !!cfg.enabled;
            return (
              <li key={b} className="flex items-center gap-4 px-5 py-3">
                <div className="flex flex-col gap-0.5 text-xs">
                  <button
                    type="button"
                    disabled={disabled || idx === 0}
                    onClick={() => moveBackend(b, -1)}
                    className="text-gray-500 hover:text-gray-800 disabled:opacity-30"
                    aria-label={`Move ${b} up`}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={disabled || idx === order.length - 1}
                    onClick={() => moveBackend(b, 1)}
                    className="text-gray-500 hover:text-gray-800 disabled:opacity-30"
                    aria-label={`Move ${b} down`}
                  >
                    ▼
                  </button>
                </div>

                <div className="flex-1">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={disabled}
                      onChange={(e) => toggleBackend(b, e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {BACKEND_LABEL[b]}
                    </span>
                  </label>
                  <p className="ml-7 text-xs text-gray-500">
                    {BACKEND_DESCRIPTION[b]}
                  </p>
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <span>Max per run</span>
                  <input
                    type="number"
                    min={1}
                    max={2000}
                    step={1}
                    value={
                      (cfg as { max_results_per_run?: number }).max_results_per_run
                      ?? (b === 'apollo' ? 500 : b === 'sales_navigator' ? 100 : 50)
                    }
                    onChange={(e) => setBackendCap(b, Number(e.target.value))}
                    disabled={disabled || !enabled}
                    className="w-20 rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-50"
                  />
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── ABM target accounts (only when ABM is enabled) ─────────────── */}
      {value.abm?.enabled && (
        <TargetAccountsEditor
          value={(value.abm?.target_accounts as TargetAccount[]) || []}
          disabled={disabled}
          onChange={(accounts) =>
            set({
              abm: {
                ...(value.abm || { enabled: true }),
                target_accounts: accounts,
              },
            })
          }
        />
      )}

      {/* ── Fallback rules ─────────────────────────────────────────────── */}
      <section className="rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800">
        <header className="border-b border-gray-200 dark:border-[#262831] px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            Fallback rules
          </h3>
          <p className="mt-0.5 text-xs text-gray-500">
            What the dispatcher does when a backend returns zero or a special
            condition is met.
          </p>
        </header>
        <div className="space-y-3 px-5 py-4 text-sm">
          <RuleRow
            label="If Apollo returns zero results"
            value={fb.if_apollo_returns_zero || 'try_sales_navigator'}
            disabled={disabled}
            onChange={(v) =>
              set({ fallback_rules: { ...fb, if_apollo_returns_zero: v as 'try_sales_navigator' | 'stop' } })
            }
            options={[
              { value: 'try_sales_navigator', label: 'Try Sales Navigator next' },
              { value: 'stop', label: 'Stop the run' },
            ]}
          />
          <RuleRow
            label="If the ICP has named target accounts (ABM)"
            value={fb.if_company_has_named_target || 'use_abm_only'}
            disabled={disabled}
            onChange={(v) =>
              set({ fallback_rules: { ...fb, if_company_has_named_target: v as 'use_abm_only' | 'mix_with_apollo' } })
            }
            options={[
              { value: 'use_abm_only', label: 'Use ABM only (skip Apollo + Sales Nav)' },
              { value: 'mix_with_apollo', label: 'Mix ABM results with Apollo + Sales Nav' },
            ]}
          />
        </div>
      </section>

      {/* ── Deduplication ──────────────────────────────────────────────── */}
      <section className="rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800">
        <header className="border-b border-gray-200 dark:border-[#262831] px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Deduplication</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            How to collapse the same person when multiple backends return them.
          </p>
        </header>
        <div className="space-y-3 px-5 py-4 text-sm">
          <fieldset>
            <legend className="mb-2 text-xs font-medium text-gray-700 dark:text-gray-300">
              Cross-backend merge strategy
            </legend>
            <div className="space-y-1.5">
              {CROSS_BACKEND_MERGE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className="flex items-start gap-2 text-sm text-gray-800 dark:text-white"
                >
                  <input
                    type="radio"
                    name="cross_backend_merge"
                    value={opt.value}
                    checked={
                      (dd.cross_backend_merge || 'highest_confidence') === opt.value
                    }
                    disabled={disabled}
                    onChange={() =>
                      set({
                        deduplication: { ...dd, cross_backend_merge: opt.value },
                      })
                    }
                    className="mt-1 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    <span className="font-medium">{opt.label}</span>
                    <span className="ml-2 text-xs text-gray-500">{opt.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      </section>

      {/* ── Total caps ──────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800">
        <header className="border-b border-gray-200 dark:border-[#262831] px-5 py-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Run caps</h3>
          <p className="mt-0.5 text-xs text-gray-500">
            Safety nets that cap how many candidates the dispatcher will
            collect across all backends.
          </p>
        </header>
        <div className="grid grid-cols-1 gap-4 px-5 py-4 text-sm sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Total cap per run
            </span>
            <input
              type="number"
              min={1}
              max={10000}
              step={50}
              value={value.total_cap_per_run ?? 800}
              onChange={(e) =>
                set({ total_cap_per_run: Number(e.target.value) })
              }
              disabled={disabled}
              className="rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm disabled:opacity-50"
            />
            <span className="text-xs text-gray-500">
              Default 800. Per-backend caps are still enforced within this.
            </span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              Total cap per day
            </span>
            <input
              type="number"
              min={1}
              max={50000}
              step={100}
              value={value.total_cap_per_day ?? 2000}
              onChange={(e) =>
                set({ total_cap_per_day: Number(e.target.value) })
              }
              disabled={disabled}
              className="rounded border border-gray-300 dark:border-slate-700 px-2 py-1.5 text-sm disabled:opacity-50"
            />
            <span className="text-xs text-gray-500">
              Default 2,000. Rolls over at midnight UTC.
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function RuleRow({
  label,
  value,
  options,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-sm text-gray-800 dark:text-gray-300">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-sm disabled:opacity-50"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
