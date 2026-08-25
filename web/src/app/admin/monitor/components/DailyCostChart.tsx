'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { LlmCostDay } from '@lad/frontend-features/lad-monitor';

const NORMAL = '#8b5cf6'; // violet - matches the LLM accent used elsewhere
const SPIKE = '#ef4444'; // red - flagged anomaly

const money = (n: number) => `$${(Number(n) || 0).toFixed(2)}`;

interface Row {
  day: string;
  label: string;
  cost: number;
  isSpike: boolean;
  calls: number;
  multiple: number | null;
  driverFeature: string | null;
  driverTenant: string | null;
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Row }> }) {
  if (!active || !payload || !payload.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs shadow-lg dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-1 font-semibold text-gray-900 dark:text-gray-100">
        {r.day} {r.isSpike ? <span className="ml-1 text-red-500">· spike</span> : null}
      </div>
      <div className="text-gray-700 dark:text-gray-300">
        Spend: <span className="font-semibold">{money(r.cost)}</span>
        {r.isSpike && r.multiple ? <span className="text-red-500"> ({r.multiple}× baseline)</span> : null}
      </div>
      <div className="text-gray-500">Calls: {r.calls.toLocaleString()}</div>
      {r.driverFeature ? (
        <div className="mt-1 border-t border-gray-100 pt-1 text-gray-500 dark:border-gray-800">
          Top driver: <span className="font-medium text-gray-700 dark:text-gray-300">{r.driverFeature}</span>
          {r.driverTenant ? <> · {r.driverTenant}</> : null}
        </div>
      ) : null}
    </div>
  );
}

export function DailyCostChart({ series }: { series: LlmCostDay[] }) {
  const data: Row[] = series.map((d) => ({
    day: d.day,
    label: d.day.slice(5), // MM-DD
    cost: d.total_cost,
    isSpike: d.is_spike,
    calls: d.calls,
    multiple: d.multiple_of_baseline,
    driverFeature: d.driver?.feature_key ?? null,
    driverTenant: d.driver?.tenant_name ?? d.driver?.tenant_id ?? null,
  }));

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Daily LLM spend</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: NORMAL }} /> normal
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: SPIKE }} /> spike
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" strokeOpacity={0.5} />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} width={48} />
          <Tooltip cursor={{ fill: 'rgba(139,92,246,0.06)' }} content={<CustomTooltip />} />
          <Bar dataKey="cost" radius={[3, 3, 0, 0]} isAnimationActive={false}>
            {data.map((r) => (
              <Cell key={r.day} fill={r.isSpike ? SPIKE : NORMAL} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="mt-2 text-[11px] text-gray-400">Days bucketed in UTC to match provider billing consoles.</p>
    </div>
  );
}
