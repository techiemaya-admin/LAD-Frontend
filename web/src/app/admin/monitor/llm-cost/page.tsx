'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CalendarClock,
  Building2,
} from 'lucide-react';
import { useLlmCost } from '@lad/frontend-features/lad-monitor';
import { StatCard } from '../components/StatCard';
import { DailyCostChart } from '../components/DailyCostChart';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;
const WINDOWS = [7, 30, 90];

export default function MonitorLlmCostPage() {
  const [days, setDays] = useState(30);
  const { data, loading, error, refetch } = useLlmCost(days);
  const s = data?.summary;
  const isEmpty = !!data && (!s || s.totalCalls === 0);
  const th = data?.thresholds;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">LLM Spend & Spikes</h2>
          <p className="text-xs text-gray-500">
            Daily Claude/Gemini/etc. cost from the billing ledger, with automatic spike attribution.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setDays(w)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  days === w
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                {w}d
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          Failed to load LLM cost: {error.message}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
          <div className="h-72 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
        </div>
      ) : isEmpty ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
          No LLM usage recorded in this window. Billing events land in
          <span className="font-mono"> billing_usage_events</span> as features call the LLM providers.
        </div>
      ) : s ? (
        <>
          {/* Headline stats */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard title={`Spend (${s.days}d)`} value={money(s.totalCost)} icon={DollarSign} accent="text-indigo-500" subtitle={`${s.totalCalls.toLocaleString()} calls`} />
            <StatCard title="Today" value={money(s.todayCost)} icon={Sparkles} accent="text-purple-500" />
            <StatCard title="Avg / active day" value={money(s.avgDailyCost)} icon={TrendingUp} accent="text-blue-500" />
            <StatCard title="Projected / mo" value={money(s.projectedMonthlyCost)} icon={CalendarClock} accent="text-cyan-500" subtitle="at current rate" />
            <StatCard title="Spikes flagged" value={s.spikeCount} icon={AlertTriangle} accent={s.spikeCount > 0 ? 'text-red-500' : 'text-emerald-500'} subtitle={s.maxDay ? `peak ${money(s.maxDayCost)} · ${s.maxDay}` : undefined} />
          </div>

          {/* Daily spend chart with spike highlighting */}
          <div className="mt-4">
            <DailyCostChart series={data!.series} />
          </div>

          {/* Spikes detail - what spiked and whose */}
          {data!.spikes.length > 0 ? (
            <div className="mt-6">
              <div className="mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Detected spikes</h3>
                {th ? (
                  <span className="text-xs text-gray-400">
                    (&gt; {th.spikeMultiplier}× trailing {th.baselineWindowDays}d median &amp; &gt; {money(th.spikeFloorUsd)})
                  </span>
                ) : null}
              </div>
              <div className="space-y-2">
                {data!.spikes.map((sp) => (
                  <div
                    key={sp.day}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50/60 px-4 py-2.5 dark:border-red-900/40 dark:bg-red-950/20"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-semibold text-gray-900 dark:text-gray-100">{sp.day}</span>
                      <span className="text-sm font-semibold text-red-600 dark:text-red-400">{money(sp.total_cost)}</span>
                      {sp.multiple_of_baseline ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          {sp.multiple_of_baseline}× baseline
                        </span>
                      ) : null}
                    </div>
                    {sp.driver ? (
                      <div className="text-xs text-gray-600 dark:text-gray-300">
                        driven by <span className="font-medium">{sp.driver.feature_key}</span>
                        {sp.driver.tenant_name || sp.driver.tenant_id ? (
                          <> · <span className="font-medium">{sp.driver.tenant_name || sp.driver.tenant_id}</span></>
                        ) : null}
                        <span className="text-gray-400"> ({money(sp.driver.cost)})</span>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Top cost drivers */}
          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* By feature */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">Top features</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Feature</th>
                      <th className="px-4 py-3 font-medium">Model</th>
                      <th className="px-4 py-3 font-medium">Calls</th>
                      <th className="px-4 py-3 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data!.byFeature.slice(0, 10).map((f, i) => (
                      <tr key={`${f.feature_key}-${f.model}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{f.feature_key}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{f.model}</td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{f.calls.toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-gray-100">{money(f.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* By tenant */}
            <div>
              <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Building2 className="h-3.5 w-3.5 text-gray-400" /> Top tenants
              </h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                  <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">Tenant</th>
                      <th className="px-4 py-3 font-medium">Calls</th>
                      <th className="px-4 py-3 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {data!.byTenant.slice(0, 10).map((t) => (
                      <tr key={t.tenant_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{t.tenant_name || t.tenant_id}</td>
                        <td className="px-4 py-2.5 text-gray-700 dark:text-gray-300">{t.calls.toLocaleString()}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-gray-100">{money(t.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Source: <span className="font-mono">billing_usage_events</span> (this environment&apos;s schema). Spend reflects what
            features logged; provider-console totals may include untracked services. Generated {data!.generatedAt
              ? new Date(data!.generatedAt).toLocaleString()
              : ''}.
          </p>
        </>
      ) : null}
    </div>
  );
}
