'use client';
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend, BarChart, Bar,
} from 'recharts';

// ─── Colours ─────────────────────────────────────────────────────────────────
const C = {
  navy:    '#0b1957',
  indigo:  '#6366f1',
  cyan:    '#06b6d4',
  amber:   '#f59e0b',
  green:   '#22c55e',
  rose:    '#f43f5e',
  slate:   '#94a3b8',
  violet:  '#8b5cf6',
};

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 mb-0.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-slate-500 capitalize">{p.name}:</span>
          <span className="font-semibold text-slate-800">{p.value?.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Funnel Row ───────────────────────────────────────────────────────────────
const FunnelRow = ({
  label, count, total, color, pct,
}: { label: string; count: number; total: number; color: string; pct?: string }) => {
  const width = total > 0 ? Math.max((count / total) * 100, count > 0 ? 4 : 0) : 0;
  return (
    <div className="flex items-center gap-3 mb-3 last:mb-0">
      <span className="w-20 text-xs font-medium text-slate-600 text-right shrink-0">{label}</span>
      <div className="flex-1 h-7 bg-slate-100 rounded-full overflow-hidden relative">
        <div
          className="h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700"
          style={{ width: `${width}%`, background: color }}
        >
          {count > 0 && (
            <span className="text-white text-xs font-bold">{count.toLocaleString()}</span>
          )}
        </div>
      </div>
      {pct !== undefined && (
        <span className="w-12 text-xs font-semibold shrink-0" style={{ color }}>
          {pct}
        </span>
      )}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
export interface AnalyticsChartsData {
  // Timeline (multi-series)
  timeline: Array<{ date: string; sent?: number; connected?: number; replied?: number; delivered?: number }>;
  // Funnel stages
  funnel: Array<{ stage: string; count: number; color?: string }>;
  // Step performance
  steps: Array<{ title: string; sent: number; connected: number; replied: number; errors: number }>;
  // Lead status donut
  leadStatus: Array<{ name: string; value: number; color: string }>;
  // Channel comparison
  channelBreakdown: Array<{ name: string; sent: number; connected: number; replied: number }>;
  // Campaign type hint
  campaignType: 'linkedin' | 'email' | 'whatsapp' | 'voice' | 'mixed';
}

export const AnalyticsCharts: React.FC<{ data: AnalyticsChartsData }> = ({ data }) => {
  const {
    funnel = [], steps = [],
    leadStatus = [], channelBreakdown = [],
  } = data;

  const totalLeads   = funnel[0]?.count || 1;
  const hasSteps     = steps.length > 0;
  const hasMultiChan = channelBreakdown.length > 1;

  return (
    <div className="space-y-6">

      {/* ── Row 1: Funnel | Step Performance | Lead Status ────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* Conversion Funnel */}
        <Card className="rounded-2xl shadow-sm border border-slate-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-bold text-slate-800">Conversion Funnel</CardTitle>
            <p className="text-xs text-slate-400">Stage-by-stage drop-off</p>
          </CardHeader>
          <CardContent className="pt-3">
            {funnel.map((stage, i) => {
              const prev = i > 0 ? funnel[i - 1].count : null;
              const pct = prev && prev > 0
                ? `${((stage.count / prev) * 100).toFixed(0)}%`
                : i === 0 ? '100%' : '—';
              const color = stage.color || [C.navy, C.indigo, C.cyan, C.green, C.amber][i % 5];
              return (
                <FunnelRow
                  key={stage.stage}
                  label={stage.stage}
                  count={stage.count}
                  total={totalLeads}
                  color={color}
                  pct={pct}
                />
              );
            })}
          </CardContent>
        </Card>

        {/* Step Performance */}
        <Card className="rounded-2xl shadow-sm border border-slate-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-bold text-slate-800">Step Performance</CardTitle>
            <p className="text-xs text-slate-400">Success vs errors per step</p>
          </CardHeader>
          <CardContent className="pt-2">
            {hasSteps ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={steps.map(s => ({
                    name: s.title.replace(/linkedin_/i, '').replace(/_/g, ' '),
                    Sent: s.sent,
                    Connected: s.connected,
                    Replied: s.replied,
                    Errors: s.errors,
                  }))}
                  layout="vertical"
                  margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} width={64} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="Sent"      fill={C.navy}   radius={[0,3,3,0]} stackId="a" />
                  <Bar dataKey="Connected" fill={C.indigo} radius={[0,3,3,0]} stackId="b" />
                  <Bar dataKey="Replied"   fill={C.green}  radius={[0,3,3,0]} stackId="c" />
                  <Bar dataKey="Errors"    fill={C.rose}   radius={[0,3,3,0]} stackId="d" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] text-slate-300 text-xs gap-2">
                <span className="text-3xl">📋</span>
                No step data yet
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lead Status Donut */}
        <Card className="rounded-2xl shadow-sm border border-slate-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-bold text-slate-800">Lead Status</CardTitle>
            <p className="text-xs text-slate-400">Current distribution across states</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={leadStatus.filter(s => s.value > 0)}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={68}
                  paddingAngle={3}
                  strokeWidth={0}
                >
                  {leadStatus.filter(s => s.value > 0).map((s, i) => (
                    <Cell key={i} fill={s.color} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-1">
              {leadStatus.filter(s => s.value > 0).map((s, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-slate-500 truncate">{s.name}</span>
                  <span className="text-xs font-bold text-slate-700 ml-auto">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Channel Comparison (only when multi-channel) ───────────── */}
      {hasMultiChan && (
        <Card className="rounded-2xl shadow-sm border border-slate-200">
          <CardHeader className="pb-1">
            <CardTitle className="text-base font-bold text-slate-800">Channel Comparison</CardTitle>
            <p className="text-xs text-slate-400">Sent · Connected · Replied across channels</p>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={channelBreakdown} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
                <Bar dataKey="sent"      name="Sent"      fill={C.navy}   radius={[4,4,0,0]} />
                <Bar dataKey="connected" name="Connected" fill={C.indigo} radius={[4,4,0,0]} />
                <Bar dataKey="replied"   name="Replied"   fill={C.green}  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalyticsCharts;
