'use client';

import React from 'react';
import { Target, DollarSign, Phone, Sparkles, RefreshCw, Calculator } from 'lucide-react';
import { useCostPerSah } from '@lad/frontend-features/lad-monitor';
import { StatCard } from '../components/StatCard';

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

export default function MonitorSahPage() {
  const { data, loading, recomputing, error, refetch, recompute } = useCostPerSah();
  const s = data?.summary;
  const isEmpty = !!data && (!s || s.sah_count === 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Cost per Sales-Accepted Handoff</h2>
        <div className="flex gap-2">
          <button
            onClick={() => recompute()}
            disabled={recomputing}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <Calculator className={`h-3.5 w-3.5 ${recomputing ? 'animate-pulse' : ''}`} />
            {recomputing ? 'Recomputing…' : 'Recompute'}
          </button>
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
          Failed to load SAH cost: {error.message}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : isEmpty ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900">
          No SAH events yet. Run migration 016, then click <span className="font-medium">Recompute</span> (or wait for the nightly job)
          to derive handoffs from bookings and attribute cost.
        </div>
      ) : s ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <StatCard title="Total SAHs" value={s.sah_count} icon={Target} accent="text-emerald-500" />
            <StatCard title="Avg Cost / SAH" value={money(s.avg_cost_per_sah)} icon={DollarSign} accent="text-blue-500" />
            <StatCard title="Total Attributed" value={money(s.total_cost)} icon={DollarSign} accent="text-indigo-500" />
            <StatCard title="Voice (precise)" value={money(s.total_voice_cost)} icon={Phone} accent="text-cyan-500" subtitle="per-lead" />
            <StatCard title="LLM (allocated)" value={money(s.total_llm_cost)} icon={Sparkles} accent="text-purple-500" subtitle="tenant-month ÷ SAHs" />
          </div>

          {data && data.byType.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.byType.map((t) => (
                <span key={t.type} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  {t.type}: <span className="font-semibold">{t.sah_count}</span> · {money(t.avg_cost_per_sah)}/SAH
                </span>
              ))}
            </div>
          ) : null}

          <h3 className="mb-2 mt-6 text-sm font-semibold text-gray-900 dark:text-gray-100">By tenant</h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">SAHs</th>
                  <th className="px-4 py-3 font-medium">Cost / SAH</th>
                  <th className="px-4 py-3 font-medium">Voice</th>
                  <th className="px-4 py-3 font-medium">LLM</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data!.byTenant.map((t) => (
                  <tr key={t.tenant_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{t.tenant_name || t.tenant_id}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.sah_count}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900 dark:text-gray-100">{money(t.avg_cost_per_sah)}</td>
                    <td className="px-4 py-3 text-gray-500">{money(t.voice_cost)}</td>
                    <td className="px-4 py-3 text-gray-500">{money(t.llm_cost)}</td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{money(t.total_cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Voice/telephony cost is attributed precisely per lead; LLM cost is allocated (tenant-month spend ÷ that month&apos;s SAH count)
            because LLM usage isn&apos;t lead-tagged in billing. Order/quotation SAH types aren&apos;t modeled yet - meetings only for now.
          </p>
        </>
      ) : null}
    </div>
  );
}
