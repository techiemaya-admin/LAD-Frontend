'use client'

import { useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { 
  format, 
  startOfYear, 
  endOfYear, 
  eachDayOfInterval, 
  isSameDay, 
  subMonths, 
  startOfMonth,
  endOfMonth,
  addDays,
  isSameMonth,
  startOfWeek,
  endOfWeek
} from 'date-fns'
import { cn } from '@/lib/utils'
import { Calendar, MessageSquare, Handshake, TrendingUp } from 'lucide-react'

interface ActivityHeatmapProps {
  data: any[] // Array of { date: string, count: number, type: 'meeting' | 'referral' | 'revenue' }
  member: any
}

export function ActivityHeatmap({ data, member }: ActivityHeatmapProps) {
  // We want to show the last 12 months like the screenshot
  const months = useMemo(() => {
    const result = []
    const now = new Date()
    // Current month is the last one (FEB in screenshot)
    // Let's generate the last 12 months
    for (let i = 11; i >= 0; i--) {
      result.push(subMonths(now, i))
    }
    return result
  }, [])

  // Process data into a lookup map for efficient rendering
  const activityMap = useMemo(() => {
    const map: Record<string, { meetings: number, referrals: number, revenue: number }> = {}
    
    data.forEach(item => {
      const dateStr = format(new Date(item.date), 'yyyy-MM-dd')
      if (!map[dateStr]) {
        map[dateStr] = { meetings: 0, referrals: 0, revenue: 0 }
      }
      
      if (item.type === 'meeting') map[dateStr].meetings += parseInt(item.count)
      if (item.type === 'referral') map[dateStr].referrals += parseInt(item.count)
      if (item.type === 'revenue') map[dateStr].revenue += parseFloat(item.count)
    });

    return map
  }, [data])

  // Get cumulative totals for the bottom section (unique day counts)
  const totals = useMemo(() => {
    const base = data.reduce((acc, item) => {
      if (item.type === 'revenue') acc.revenue += parseFloat(item.count)
      return acc
    }, { revenue: 0 })

    // Unique days with meetings or referrals
    const uniqueMeetingDays = Object.values(activityMap).filter(d => d.meetings > 0).length
    const uniqueReferralDays = Object.values(activityMap).filter(d => d.referrals > 0).length
    const uniqueEngagementDays = Object.values(activityMap).filter(d => d.meetings > 0 || d.referrals > 0).length

    return {
      meetings: uniqueMeetingDays,
      referrals: uniqueReferralDays,
      uniqueEngagements: uniqueEngagementDays,
      revenue: base.revenue,
    }
  }, [data, activityMap])

  // Combination matrix coloring:
  // Red (#EF4444)   = Meeting Only
  // Orange (#EAB308) = Referral Only
  // Green (#10B981) = Both Meetings & Referrals
  const getDotStyle = (date: Date): { className: string; style?: React.CSSProperties } => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const dayData = activityMap[dateStr]
    if (!dayData) return { className: 'bg-slate-50 border-slate-100' }

    const hasMeeting = dayData.meetings > 0
    const hasReferral = dayData.referrals > 0

    if (!hasMeeting && !hasReferral) return { className: 'bg-slate-50 border-slate-100' }

    if (hasMeeting && hasReferral) {
      return { className: 'border-[#10B981]', style: { backgroundColor: '#10B981' } }
    }
    if (hasMeeting) {
      return { className: 'border-[#EF4444]', style: { backgroundColor: '#EF4444' } }
    }
    // referral only
    return { className: 'border-[#EAB308]', style: { backgroundColor: '#EAB308' } }
  }

  return (
    <div className="space-y-8">
      {/* Month-based Heatmap Grid */}
      <div className="flex overflow-x-auto pb-4 gap-6 no-scrollbar">
        {months.map((month, mIdx) => {
          const start = startOfMonth(month)
          const end = endOfMonth(month)
          const days = eachDayOfInterval({ start, end })
          
          return (
            <div key={mIdx} className="flex flex-col gap-3 min-w-[100px]">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest pl-1">
                {format(month, 'MMM')}
              </span>
              
              <div className="grid grid-rows-7 grid-flow-col gap-1.5">
                {/* Pad days if month doesn't start on Sunday for alignment */}
                {Array.from({ length: start.getDay() }).map((_, i) => (
                  <div key={`pad-${i}`} className="w-4 h-4" />
                ))}
                
                {days.map((day, dIdx) => {
                  const dot = getDotStyle(day)
                  return (
                    <div
                      key={dIdx}
                      className={cn(
                        "w-4 h-4 rounded-sm border-[0.5px] transition-all hover:scale-150 hover:z-10 cursor-help",
                        dot.className
                      )}
                      style={dot.style}
                      title={`${format(day, 'MMM d, yyyy')}: ${activityMap[format(day, 'yyyy-MM-dd')]?.meetings || 0} meetings, ${activityMap[format(day, 'yyyy-MM-dd')]?.referrals || 0} referrals`}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm bg-slate-50 border border-slate-100" />
          <span>No activity</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#EF4444' }} />
          <span>Meeting Only</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#EAB308' }} />
          <span>Referral Only</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: '#10B981' }} />
          <span>Both</span>
        </div>
      </div>

      {/* Aggregate Metrics (Screenshot Style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 pt-10 border-t border-slate-100">
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Unique Meetings</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-emerald-600 tracking-tight">
              +{totals.meetings}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Unique Referrals Passed</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-rose-500 tracking-tight">
              +{totals.referrals}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Impact Generated (AED)</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-slate-900 tracking-tight">
              {totals.revenue.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Avg. Monthly Unique Engagements</p>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold text-blue-600 tracking-tight">
              {Math.round(totals.uniqueEngagements / 12)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
