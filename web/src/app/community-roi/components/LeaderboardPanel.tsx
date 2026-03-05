'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trophy, Users, Handshake, TrendingUp, Medal } from 'lucide-react'
import { useDashboardLeaderboards } from '@lad/frontend-features/community-roi'
import { Badge } from '@/components/ui/badge'
import { ImportDataDialog } from './ImportDataDialog'

export default function LeaderboardPanel() {
  const { data: stats, isLoading } = useDashboardLeaderboards()

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-slate-50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  //if (!stats) return null;

  // Helper to render a medal or ranking index
  const renderRank = (index: number) => {
    if (index === 0) return <Medal className="w-5 h-5 text-yellow-500 fill-yellow-500" />
    if (index === 1) return <Medal className="w-5 h-5 text-slate-400 fill-slate-400" />
    if (index === 2) return <Medal className="w-5 h-5 text-orange-400 fill-orange-400" />
    return <span className="font-bold text-slate-400 text-sm">#{index + 1}</span>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">Top Performers</h2>
        </div>
        <ImportDataDialog />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Top 10 TYFCB (Total Business) */}
        <Card className="rounded-[1.5rem] border-slate-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-br from-amber-50 to-orange-50/50 border-b border-amber-100/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-amber-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-600" />
                Top 10 - TYFCB Total
              </CardTitle>
              <Badge className="bg-white/80 text-amber-700 hover:bg-white text-[10px] font-bold">AED</Badge>
            </div>
            <p className="text-xs text-amber-600/80 font-medium mt-1">Highest revenue generators</p>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-slate-50">
              {stats?.topTyfcb.map((member, i) => (
                <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors group">
                  <div className="w-8 flex items-center justify-center shrink-0">
                    {renderRank(i)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs text-slate-500 truncate">{member.company_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-amber-600 text-sm tabular-nums">
                      {(member.value || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {(!stats?.topTyfcb || stats.topTyfcb.length === 0) && (
                <div className="p-8 text-center text-slate-400 text-sm">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 10 Referrals (Unique Recipients) */}
        <Card className="rounded-[1.5rem] border-slate-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-br from-emerald-50 to-green-50/50 border-b border-emerald-100/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-emerald-900 flex items-center gap-2">
                <Handshake className="w-5 h-5 text-emerald-600" />
                Top 10 - Referrals
              </CardTitle>
              <Badge className="bg-white/80 text-emerald-700 hover:bg-white text-[10px] font-bold">Unique Recipients</Badge>
            </div>
            <p className="text-xs text-emerald-600/80 font-medium mt-1">Most diverse referral givers</p>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-slate-50">
              {stats?.topReferrals.map((member, i) => (
                <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors group">
                  <div className="w-8 flex items-center justify-center shrink-0">
                    {renderRank(i)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs text-slate-500 truncate">{member.company_name}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold tabular-nums">
                      {member.value}
                    </Badge>
                  </div>
                  {/* Decorative bar showing distinct recipients */}
                </div>
              ))}
              {(!stats?.topReferrals || stats.topReferrals.length === 0) && (
                <div className="p-8 text-center text-slate-400 text-sm">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 10 One-to-Ones (Unique Partners) */}
        <Card className="rounded-[1.5rem] border-slate-200 shadow-sm overflow-hidden flex flex-col h-full hover:shadow-lg transition-shadow">
          <CardHeader className="bg-gradient-to-br from-blue-50 to-indigo-50/50 border-b border-blue-100/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-blue-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Top 10 - One-to-Ones
              </CardTitle>
              <Badge className="bg-white/80 text-blue-700 hover:bg-white text-[10px] font-bold">Unique Partners</Badge>
            </div>
            <p className="text-xs text-blue-600/80 font-medium mt-1">Most connected networkers</p>
          </CardHeader>
          <CardContent className="p-0 flex-1">
            <div className="divide-y divide-slate-50">
              {stats?.topMeetings.map((member, i) => (
                <div key={member.id} className="flex items-center gap-4 p-4 hover:bg-slate-50/80 transition-colors group">
                  <div className="w-8 flex items-center justify-center shrink-0">
                    {renderRank(i)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs text-slate-500 truncate">{member.company_name}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 font-bold tabular-nums">
                      {member.value}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!stats?.topMeetings || stats.topMeetings.length === 0) && (
                <div className="p-8 text-center text-slate-400 text-sm">No data available</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
