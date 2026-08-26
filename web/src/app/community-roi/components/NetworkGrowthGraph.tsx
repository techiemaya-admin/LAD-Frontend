'use client'

import { useState, useMemo, useEffect } from 'react'
import { X, Users, Handshake, DollarSign, ArrowUpRight, ArrowDownRight, Loader2, Zap } from 'lucide-react'
import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
} from 'recharts'
import { format } from 'date-fns'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface MonthRow {
  month: string           // 'YYYY-MM'
  weekLabel: string       // display label for axis
  uniqueMeetings: number  // pairs that actually had a 1-2-1 (type 1 or 3)
  uniqueReferrals: number
  upgrades: number        // relationships that improved vs prior snapshot
  downgrades: number      // relationships that degraded vs prior snapshot
  netUpgrades: number     // upgrades - downgrades; a positive upgrade count can
                          // still be a net decline (Jun 2026: +156 / -372)
  activeMembers: number   // roster size that month - totals shrink when members
                          // leave, so this is needed to read the trend correctly
  tyfcbAed: number
  tyfcbTracked: boolean   // false when the tenant records no TYFCB - hide, not 0
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────

interface TooltipEntry { dataKey: string; name: string; color: string; value: number }
interface TooltipProps { active?: boolean; payload?: TooltipEntry[]; label?: string }

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-4 text-xs">
      <p className="font-bold text-slate-700 mb-2">{label?.replace('\n', ' · ')}</p>
      {payload.map((entry) => (
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
  const [mode, setMode] = useState<'monthly' | 'cumulative'>('monthly')
  const [rawData, setRawData] = useState<MonthRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)

  // ── Fetch live data ──────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true)
    fetch('/api/community-roi/analytics/network-growth', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json?.success && Array.isArray(json.data) && json.data.length > 0) {
          const rows: MonthRow[] = json.data.map((r: Record<string, unknown>) => ({
            month:          String(r.month ?? ''),
            // Format 'YYYY-MM' → 'May 2026' for axis label
            weekLabel: (() => {
              const raw = String(r.month ?? '')
              try {
                const [y, m] = raw.split('-')
                return format(new Date(Number(y), Number(m) - 1, 1), 'MMM yyyy')
              } catch { return raw }
            })(),
            uniqueMeetings:  Number(r.uniqueMeetings  || 0),
            uniqueReferrals: Number(r.uniqueReferrals || 0),
            upgrades:        Number(r.upgrades        || 0),
            downgrades:      Number(r.downgrades      || 0),
            netUpgrades:     Number(r.netUpgrades ?? (Number(r.upgrades || 0) - Number(r.downgrades || 0))),
            activeMembers:   Number(r.activeMembers   || 0),
            tyfcbAed:        Number(r.tyfcbAed        || 0),
            tyfcbTracked:    Boolean(r.tyfcbTracked),
          }))
          setRawData(rows)
          setIsLive(true)
        } else {
          // No data yet - fall back to mock so the graph is never blank
          setRawData(null)
          setIsLive(false)
        }
      })
      .catch(() => { setRawData(null); setIsLive(false) })
      .finally(() => setLoading(false))
  }, [])

  // ── Chart data (live or mock) ────────────────────────────────────────────────
  const baseData: MonthRow[] = rawData ?? MOCK_DATA

  // Meetings/referrals are STATE snapshots (all relationships as of that month),
  // so they must NOT be summed across months - the same pair would be counted
  // once per snapshot. Only upgrades/downgrades/TYFCB are true monthly deltas
  // and can accumulate.
  const chartData = useMemo(() => {
    if (mode === 'monthly') return baseData
    let cumUpgrades = 0, cumTyfcb = 0
    return baseData.map(w => {
      cumUpgrades += w.upgrades
      cumTyfcb    += w.tyfcbAed
      return { ...w, upgrades: cumUpgrades, tyfcbAed: cumTyfcb }
    })
  }, [baseData, mode])

  // ── Summary KPIs ─────────────────────────────────────────────────────────────
  const first = baseData[0]
  const last  = baseData[baseData.length - 1]
  // Latest snapshot = current state (summing snapshots would multi-count pairs).
  const currentMeetings  = last.uniqueMeetings
  const currentReferrals = last.uniqueReferrals
  // Upgrades/downgrades ARE per-month deltas, so totals are meaningful.
  const totalUpgrades    = baseData.reduce((s, w) => s + w.upgrades,   0)
  const totalDowngrades  = baseData.reduce((s, w) => s + w.downgrades, 0)
  const netUpgrades      = totalUpgrades - totalDowngrades
  const totalTyfcb       = baseData.reduce((s, w) => s + w.tyfcbAed,   0)
  const showTyfcb        = !isLive || baseData.some(w => w.tyfcbTracked || w.tyfcbAed > 0)
  // Signed - the old version hardcoded '+' and rendered "+-15%" on a decline.
  const pctGrowth = (a: number, b: number) =>
    b === 0 ? '-' : `${a - b >= 0 ? '+' : ''}${Math.round(((a - b) / b) * 100)}%`
  const meetingGrowth  = pctGrowth(last.uniqueMeetings,  first.uniqueMeetings)
  const referralGrowth = pctGrowth(last.uniqueReferrals, first.uniqueReferrals)
  const tyfcbGrowth    = pctGrowth(last.tyfcbAed,        first.tyfcbAed)
  // Per-member normalisation: the roster changes month to month, so absolute
  // totals fall when members leave even if engagement improves.
  const perMember = (w: MonthRow) =>
    w.activeMembers > 0 ? (w.uniqueMeetings / w.activeMembers).toFixed(1) : '-'
  const memberGrowth = pctGrowth(last.activeMembers, first.activeMembers)

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-y-auto bg-slate-50 rounded-t-3xl md:rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-8 py-5 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Network Growth Graph</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {loading
                ? 'Loading…'
                : isLive
                  ? 'Month-by-month improvement in meetings, referrals & business generated'
                  : 'Month-by-month improvement in meetings, referrals & business generated (illustrative)'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Monthly / Cumulative toggle */}
            <div className="flex bg-slate-100 rounded-xl p-1 text-xs font-semibold">
              <button
                onClick={() => setMode('monthly')}
                className={`px-4 py-1.5 rounded-lg transition-all ${
                  mode === 'monthly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'
                }`}
              >
                Monthly
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
          {loading ? (
            <div className="flex items-center justify-center py-24 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-sm">Loading growth data…</span>
            </div>
          ) : (
            <>
              {/* KPI summary row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KpiCard
                  icon={<Users className="w-4 h-4 text-blue-600" />}
                  label={`Unique Meetings (${last.weekLabel})`}
                  value={currentMeetings.toString()}
                  growth={meetingGrowth}
                  color="bg-blue-50"
                />
                <KpiCard
                  icon={<Handshake className="w-4 h-4 text-orange-500" />}
                  label={`Unique Referrals (${last.weekLabel})`}
                  value={currentReferrals.toString()}
                  growth={referralGrowth}
                  color="bg-orange-50"
                />
                <KpiCard
                  icon={<Zap className="w-4 h-4 text-violet-600" />}
                  label="Net Relationship Change"
                  value={`${netUpgrades >= 0 ? '+' : ''}${netUpgrades}`}
                  growth={isLive ? `${totalUpgrades} up · ${totalDowngrades} down` : '-'}
                  color="bg-violet-50"
                />
                {showTyfcb ? (
                  <KpiCard
                    icon={<DollarSign className="w-4 h-4 text-emerald-600" />}
                    label="Total TYFCB (AED)"
                    value={totalTyfcb >= 1000 ? `${(totalTyfcb / 1000).toFixed(0)}K` : totalTyfcb.toString()}
                    growth={tyfcbGrowth}
                    color="bg-emerald-50"
                  />
                ) : (
                  <KpiCard
                    icon={<Users className="w-4 h-4 text-slate-600" />}
                    label={`Active Members (${last.weekLabel})`}
                    value={last.activeMembers ? last.activeMembers.toString() : '-'}
                    growth={memberGrowth}
                    color="bg-slate-100"
                  />
                )}
              </div>

              {/* Main chart */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {mode === 'monthly' ? 'Monthly' : 'Cumulative'} Growth Trend
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {isLive ? `${baseData.length} month${baseData.length !== 1 ? 's' : ''} of data` : 'Illustrative - upload meeting reports to see real data'}
                    </p>
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
                      <span className="inline-block w-3 h-3 rounded-full bg-violet-500" />
                      Upgrades
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
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        interval={0}
                      />

                      {/* Left Y - counts */}
                      <YAxis
                        yAxisId="count"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        width={32}
                      />

                      {/* Right Y - AED */}
                      <YAxis
                        yAxisId="aed"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                        tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)}
                        width={44}
                      />

                      <Tooltip content={<CustomTooltip />} />

                      {/* TYFCB bars (drawn first = behind). Hidden when the tenant
                          records no TYFCB - a flat 0 series is just noise. */}
                      {showTyfcb && (
                        <Bar
                          yAxisId="aed"
                          dataKey="tyfcbAed"
                          name="TYFCB (AED)"
                          fill="#10b981"
                          opacity={0.18}
                          radius={[4, 4, 0, 0]}
                          barSize={28}
                        />
                      )}

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

                      {/* Upgrades line - dashed violet, shows relationship improvements */}
                      <Line
                        yAxisId="count"
                        type="monotone"
                        dataKey="upgrades"
                        name="Upgrades"
                        stroke="#7c3aed"
                        strokeWidth={2}
                        strokeDasharray="5 3"
                        dot={{ r: 4, fill: '#7c3aed', strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: '#7c3aed' }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Month-by-month table */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-800">Monthly Breakdown</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Members</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-blue-400 uppercase tracking-wider">Unique Meetings</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-blue-300 uppercase tracking-wider">Per Member</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-orange-400 uppercase tracking-wider">Unique Referrals</th>
                        <th className="text-right px-4 py-3 text-[10px] font-bold text-violet-500 uppercase tracking-wider">Net Change</th>
                        {showTyfcb && (
                          <th className="text-right px-4 py-3 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">TYFCB (AED)</th>
                        )}
                        <th className="text-right px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">MoM Meetings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {baseData.map((w, i) => {
                        const prev = baseData[i - 1]
                        // MoM is based on MEETINGS (the headline metric). It used to be
                        // derived only from TYFCB, so it showed ' - ' on every row for any
                        // tenant that doesn't record TYFCB.
                        const momMeetings = prev && prev.uniqueMeetings > 0
                          ? Math.round(((w.uniqueMeetings - prev.uniqueMeetings) / prev.uniqueMeetings) * 100)
                          : null
                        const delta = (cur: number, before: number | undefined) =>
                          before === undefined ? null : cur - before
                        const dMeet = prev ? delta(w.uniqueMeetings, prev.uniqueMeetings) : null
                        const dRef  = prev ? delta(w.uniqueReferrals, prev.uniqueReferrals) : null
                        const dMem  = prev ? delta(w.activeMembers, prev.activeMembers) : null
                        const signCls = (n: number) => (n > 0 ? 'text-emerald-500' : n < 0 ? 'text-rose-500' : 'text-slate-300')
                        const signTxt = (n: number) => `${n > 0 ? '+' : ''}${n}`
                        return (
                          <tr key={w.month} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-3 font-semibold text-slate-700">
                              {w.weekLabel}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-600">
                              {w.activeMembers || '-'}
                              {dMem !== null && dMem !== 0 && (
                                <span className={`ml-1 text-[9px] ${signCls(dMem)}`}>{signTxt(dMem)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-blue-600">
                              {w.uniqueMeetings}
                              {dMeet !== null && dMeet !== 0 && (
                                <span className={`ml-1 text-[9px] ${signCls(dMeet)}`}>{signTxt(dMeet)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-blue-400">
                              {perMember(w)}
                            </td>
                            <td className="px-4 py-3 text-right font-bold text-orange-500">
                              {w.uniqueReferrals}
                              {dRef !== null && dRef !== 0 && (
                                <span className={`ml-1 text-[9px] ${signCls(dRef)}`}>{signTxt(dRef)}</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right font-bold">
                              {w.upgrades === 0 && w.downgrades === 0 ? (
                                <span className="text-slate-300">-</span>
                              ) : (
                                <span
                                  className={`inline-flex items-center gap-0.5 ${
                                    w.netUpgrades >= 0 ? 'text-violet-600' : 'text-rose-600'
                                  }`}
                                  title={`${w.upgrades} improved, ${w.downgrades} degraded`}
                                >
                                  {w.netUpgrades >= 0
                                    ? <ArrowUpRight className="w-3 h-3" />
                                    : <ArrowDownRight className="w-3 h-3" />}
                                  {signTxt(w.netUpgrades)}
                                  <span className="ml-1 font-normal text-[9px] text-slate-400">
                                    ({w.upgrades}↑ {w.downgrades}↓)
                                  </span>
                                </span>
                              )}
                            </td>
                            {showTyfcb && (
                              <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                {w.tyfcbAed.toLocaleString()}
                              </td>
                            )}
                            <td className="px-6 py-3 text-right">
                              {momMeetings !== null ? (
                                <span
                                  className={`inline-flex items-center gap-0.5 font-bold ${
                                    momMeetings >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                  }`}
                                >
                                  {momMeetings >= 0
                                    ? <ArrowUpRight className="w-3 h-3" />
                                    : <ArrowDownRight className="w-3 h-3" />}
                                  {momMeetings}%
                                </span>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {!isLive && (
                <p className="text-center text-[10px] text-slate-300 pb-2">
                  ✦ Showing illustrative data - upload member meeting reports via Import Data to see real month-by-month growth
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Fallback mock data (shown until real uploads come in) ─────────────────────

const MOCK_DATA: MonthRow[] = [
  { month: '2026-01', weekLabel: 'Jan 2026', uniqueMeetings: 3,  uniqueReferrals: 1, upgrades: 0, tyfcbAed: 5_000  , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-02', weekLabel: 'Feb 2026', uniqueMeetings: 4,  uniqueReferrals: 2, upgrades: 0, tyfcbAed: 9_500  , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-03', weekLabel: 'Mar 2026', uniqueMeetings: 5,  uniqueReferrals: 2, upgrades: 0, tyfcbAed: 14_000 , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-04', weekLabel: 'Apr 2026', uniqueMeetings: 6,  uniqueReferrals: 3, upgrades: 0, tyfcbAed: 20_000 , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-05', weekLabel: 'May 2026', uniqueMeetings: 7,  uniqueReferrals: 3, upgrades: 0, tyfcbAed: 26_000 , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-06', weekLabel: 'Jun 2026', uniqueMeetings: 8,  uniqueReferrals: 4, upgrades: 0, tyfcbAed: 34_000 , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-07', weekLabel: 'Jul 2026', uniqueMeetings: 9,  uniqueReferrals: 5, upgrades: 0, tyfcbAed: 43_000 , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-08', weekLabel: 'Aug 2026', uniqueMeetings: 10, uniqueReferrals: 5, upgrades: 0, tyfcbAed: 53_000 , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-09', weekLabel: 'Sep 2026', uniqueMeetings: 11, uniqueReferrals: 6, upgrades: 0, tyfcbAed: 65_000 , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-10', weekLabel: 'Oct 2026', uniqueMeetings: 12, uniqueReferrals: 7, upgrades: 0, tyfcbAed: 80_000 , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-11', weekLabel: 'Nov 2026', uniqueMeetings: 13, uniqueReferrals: 8, upgrades: 0, tyfcbAed: 96_000 , downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
  { month: '2026-12', weekLabel: 'Dec 2026', uniqueMeetings: 15, uniqueReferrals: 9, upgrades: 0, tyfcbAed: 115_000, downgrades: 0, netUpgrades: 0, activeMembers: 40, tyfcbTracked: true },
]
