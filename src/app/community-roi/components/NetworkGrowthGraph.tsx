'use client'

import { useState, useMemo } from 'react'
import { X, TrendingUp, Users, Handshake, DollarSign, ArrowUpRight } from 'lucide-react'
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { subWeeks, format } from 'date-fns'

// ─── Mock weekly data (12 weeks of growth) ────────────────────────────────────

const WEEKLY_MOCK: Array<{
  week: string
  weekLabel: string
  uniqueMeetings: number
  uniqueReferrals: number
  tyfcbAed: number
}> = (() => {
  const now = new Date()
  return [
    { uniqueMeetings: 3,  uniqueReferrals: 1, tyfcbAed: 5_000  },
    { uniqueMeetings: 4,  uniqueReferrals: 2, tyfcbAed: 9_500  },
    { uniqueMeetings: 5,  uniqueReferrals: 2, tyfcbAed: 14_000 },
    { uniqueMeetings: 6,  uniqueReferrals: 3, tyfcbAed: 20_000 },
    { uniqueMeetings: 7,  uniqueReferrals: 3, tyfcbAed: 26_000 },
    { uniqueMeetings: 8,  uniqueReferrals: 4, tyfcbAed: 34_000 },
    { uniqueMeetings: 9,  uniqueReferrals: 5, tyfcbAed: 43_000 },
    { uniqueMeetings: 10, uniqueReferrals: 5, tyfcbAed: 53_000 },
    { uniqueMeetings: 11, uniqueReferrals: 6, tyfcbAed: 65_000 },
    { uniqueMeetings: 12, uniqueReferrals: 7, tyfcbAed: 80_000 },
    { uniqueMeetings: 13, uniqueReferrals: 8, tyfcbAed: 96_000 },
    { uniqueMeetings: 15, uniqueReferrals: 9, tyfcbAed: 115_000},
  ].map((d, i) => {
    const weekStart = subWeeks(now, 11 - i)
    return {
      ...d,
      week: format(weekStart, 'yyyy-MM-dd'),
      weekLabel: `Wk ${i + 1}\n${format(weekStart, 'MMM d')}`,
    }
  })
})()

// ─── Custom tooltip ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-xs">
      <p className="font-bold text-slate-700 mb-2">{label?.replace('\n', ' · ')}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-slate-500">{entry.name}:</span>
          <span className="font-semibold text-slate-800">
            {entry.dataKey === 'tyfcbAed'
              ? `AED ${Number(entry.value).toLocaleString()}`
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  icon: React.ReactNode
  label: string
  value: string
  growth: string
  color: string
}
const KpiCard = ({ icon, label, value, growth, color }: KpiCardProps) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-3">
    <div className="flex items-center justify-between">
      <div className={`p-2 rounded-xl ${color}`}>{icon}</div>
      <span className="flex items-center gap-1 text-emerald-600 text-xs font-bold">
        <ArrowUpRight className="w-3 h-3" /> {growth}
      </span>
    </div>
    <div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
    </div>
  </div>
)

// ─── Main component ────────────────────────────────────────────────────────────

interface NetworkGrowthGraphProps {
  onClose: () => void
}

export function NetworkGrowthGraph({ onClose }: NetworkGrowthGraphProps) {
  const [mode, setMode] = useState<'weekly' | 'cumulative'>('weekly')

  const chartData = useMemo(() => {
    if (mode === 'weekly') return WEEKLY_MOCK

    // Cumulative view
    let cumMeetings = 0, cumReferrals = 0, cumTyfcb = 0
    return WEEKLY_MOCK.map(w => {
      cumMeetings  += w.uniqueMeetings
      cumReferrals += w.uniqueReferrals
      cumTyfcb     += w.tyfcbAed
      return { ...w, uniqueMeetings: cumMeetings, uniqueReferrals: cumReferrals, tyfcbAed: cumTyfcb }
    })
  }, [mode])

  // Summary KPIs
  const first = WEEKLY_MOCK[0]
  const last  = WEEKLY_MOCK[WEEKLY_MOCK.length - 1]
  const totalMeetings  = WEEKLY_MOCK.reduce((s, w) => s + w.uniqueMeetings,  0)
  const totalReferrals = WEEKLY_MOCK.reduce((s, w) => s + w.uniqueReferrals, 0)
  const totalTyfcb     = WEEKLY_MOCK.reduce((s, w) => s + w.tyfcbAed,        0)
  const meetingGrowth  = Math.round(((last.uniqueMeetings  - first.uniqueMeetings)  / first.uniqueMeetings)  * 100)
  const referralGrowth = Math.round(((last.uniqueReferrals - first.uniqueReferrals) / first.uniqueReferrals) * 100)
  const tyfcbGrowth    = Math.round(((last.tyfcbAed        - first.tyfcbAed)        / first.tyfcbAed)        * 100)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-50 rounded-t-3xl md:rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Network Growth Graph</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Week-by-week improvement in meetings, referrals &amp; business generated (mock data)
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Weekly / Cumulative toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-semibold">
              <button
                onClick={() => setMode('weekly')}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  mode === 'weekly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Weekly
              </button>
              <button
                onClick={() => setMode('cumulative')}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  mode === 'cumulative' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Cumulative
              </button>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* KPI summary row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiCard
              icon={<Users className="w-4 h-4 text-blue-600" />}
              label="Total Unique Meetings"
              value={totalMeetings.toString()}
              growth={`+${meetingGrowth}%`}
              color="bg-blue-50"
            />
            <KpiCard
              icon={<Handshake className="w-4 h-4 text-orange-500" />}
              label="Total Unique Referrals"
              value={totalReferrals.toString()}
              growth={`+${referralGrowth}%`}
              color="bg-orange-50"
            />
            <KpiCard
              icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
              label="Total TYFCB (AED)"
              value={`${(totalTyfcb / 1000).toFixed(0)}K`}
              growth={`+${tyfcbGrowth}%`}
              color="bg-emerald-50"
            />
            <KpiCard
              icon={<TrendingUp className="w-4 h-4 text-purple-600" />}
              label="Avg. AED / Referral"
              value={`${Math.round(totalTyfcb / totalReferrals / 1000)}K`}
              growth="+22%"
              color="bg-purple-50"
            />
          </div>

          {/* Main chart */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-base font-bold text-slate-800">
                  {mode === 'weekly' ? 'Weekly' : 'Cumulative'} Growth Trend
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Last 12 weeks</p>
              </div>
              <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-blue-500" />
                  Unique Meetings
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-orange-400" />
                  Unique Referrals
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500" />
                  TYFCB (AED)
                </span>
              </div>
            </div>

            <div className="h-[380px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 60, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradMeetings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradReferrals" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#f97316" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />

                  <XAxis
                    dataKey="weekLabel"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', whiteSpace: 'pre' }}
                    interval={0}
                  />

                  {/* Left Y — counts */}
                  <YAxis
                    yAxisId="count"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    width={32}
                  />

                  {/* Right Y — AED */}
                  <YAxis
                    yAxisId="aed"
                    orientation="right"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`}
                    width={44}
                  />

                  <Tooltip content={<CustomTooltip />} />

                  {/* TYFCB bars (drawn first = behind) */}
                  <Bar
                    yAxisId="aed"
                    dataKey="tyfcbAed"
                    name="TYFCB (AED)"
                    fill="#10b981"
                    opacity={0.18}
                    radius={[4, 4, 0, 0]}
                    barSize={28}
                  />

                  {/* Meetings area */}
                  <Area
                    yAxisId="count"
                    type="monotone"
                    dataKey="uniqueMeetings"
                    name="Unique Meetings"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    fill="url(#gradMeetings)"
                    dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#3b82f6' }}
                  />

                  {/* Referrals area */}
                  <Area
                    yAxisId="count"
                    type="monotone"
                    dataKey="uniqueReferrals"
                    name="Unique Referrals"
                    stroke="#f97316"
                    strokeWidth={2.5}
                    fill="url(#gradReferrals)"
                    dot={{ r: 3, fill: '#f97316', strokeWidth: 0 }}
                    activeDot={{ r: 5, fill: '#f97316' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Week-by-week table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800">Weekly Breakdown</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Week</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider">Unique Meetings</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-orange-400 uppercase tracking-wider">Unique Referrals</th>
                    <th className="text-right px-4 py-3 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">TYFCB (AED)</th>
                    <th className="text-right px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">WoW Growth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {WEEKLY_MOCK.map((w, i) => {
                    const prev = WEEKLY_MOCK[i - 1]
                    const wowTyfcb = prev
                      ? Math.round(((w.tyfcbAed - prev.tyfcbAed) / prev.tyfcbAed) * 100)
                      : null
                    return (
                      <tr key={w.week} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-3 font-semibold text-slate-700">
                          Wk {i + 1} <span className="text-slate-400 font-normal">· {format(new Date(w.week), 'MMM d')}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-600">
                          {w.uniqueMeetings}
                          {prev && w.uniqueMeetings > prev.uniqueMeetings && (
                            <span className="ml-1 text-emerald-500 text-[9px]">
                              +{w.uniqueMeetings - prev.uniqueMeetings}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-orange-500">
                          {w.uniqueReferrals}
                          {prev && w.uniqueReferrals > prev.uniqueReferrals && (
                            <span className="ml-1 text-emerald-500 text-[9px]">
                              +{w.uniqueReferrals - prev.uniqueReferrals}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                          {w.tyfcbAed.toLocaleString()}
                        </td>
                        <td className="px-6 py-3 text-right">
                          {wowTyfcb !== null ? (
                            <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
                              <ArrowUpRight className="w-3 h-3" /> {wowTyfcb}%
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-300 pb-2">
            ✦ Showing illustrative mock data — connect live data via the activity tracking pipeline
          </p>
        </div>
      </div>
    </div>
  )
}
