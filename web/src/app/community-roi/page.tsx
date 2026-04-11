'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Users,
  MessageSquare,
  Network,
  Activity,
  Search,
  ChevronRight,
  Building2,
  Phone,
  Linkedin,
  Trophy,
  ArrowUpRight,
  Handshake,
  CalendarDays,
  LayoutDashboard,
} from 'lucide-react'

import { useListMembers } from '@lad/frontend-features/community-roi'
import SimpleAnalyticsCards from '@/features/community-roi/components/SimpleAnalyticsCards'
import RelationshipHeatmap from '@/features/community-roi/components/RelationshipHeatmap'
import MemberProfileView from './components/MemberProfileView'
import LeaderboardPanel from './components/LeaderboardPanel'
import { NetworkGrowthGraph } from './components/NetworkGrowthGraph'
import DataImportButton from '@/features/community-roi/components/DataImportButton'
import CommunityCalendar from './components/CommunityCalendar'
import MemberIntelFeed from './components/MemberIntelFeed'

type ActiveView = 'dashboard' | 'calendar'

export default function CommunityROIDashboard() {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [showNetworkGraph, setShowNetworkGraph] = useState(false)
  const [selectedCommunity, setSelectedCommunity] = useState('BNI')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')

  // Get tenant ID from environment or props (without Redux dependency)
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || '';
  const { data: members, isLoading: membersLoading } = useListMembers({ tenantId })

  const communities = [
    { id: 'BNI', name: 'BNI Rising Phoenix', icon: Building2, color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'WhatsApp', name: 'WhatsApp Group', icon: Phone, color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'LinkedIn', name: 'LinkedIn Network', icon: Linkedin, color: 'text-blue-600', bg: 'bg-blue-50' },
  ]

  const filteredMembers = Array.isArray(members) 
    ? members.filter((m: any) => (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  return (
    <>
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Member Sidebar */}
      <div className="w-80 border-r bg-white flex flex-col shrink-0">
        {/* Channel Selection */}
        <div className="p-4 flex gap-3 border-b overflow-x-auto no-scrollbar bg-slate-50/50">
          {communities.map((community) => (
            <button
              key={community.id}
              onClick={() => {
                setSelectedCommunity(community.id);
                setSelectedMemberId(null);
              }}
              className={`flex-shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                selectedCommunity === community.id 
                  ? 'bg-slate-900 text-white shadow-lg ring-4 ring-slate-900/10' 
                  : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-200'
              }`}
              title={community.name}
            >
              <community.icon className="w-6 h-6" />
            </button>
          ))}
        </div>

        <div className="p-4 border-b space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg text-slate-800">Members</h2>
            <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
              {filteredMembers.length} Total
            </Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search members..." 
              className="pl-10 bg-slate-50 border-slate-200"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {membersLoading ? (
            <div className="p-8 text-center space-y-2">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Loading network...</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredMembers.map((member: any) => (
                <button
                  key={member.id}
                  onClick={() => setSelectedMemberId(member.id)}
                  className={`w-full p-4 text-left transition-all group flex items-center justify-between ${
                    selectedMemberId === member.id 
                      ? 'bg-blue-50 border-r-4 border-blue-600' 
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      selectedMemberId === member.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {(member.name || 'M').split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`font-semibold text-sm truncate ${selectedMemberId === member.id ? 'text-blue-900' : 'text-slate-800'}`}>
                        {member.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{member.email || 'No email'}</p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 shrink-0 transition-transform ${
                    selectedMemberId === member.id ? 'text-blue-600 translate-x-1' : 'text-slate-300 group-hover:translate-x-1'
                  }`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-8">
          {selectedMemberId ? (
            <MemberProfileView memberId={selectedMemberId} onBack={() => setSelectedMemberId(null)} />
          ) : activeView === 'calendar' ? (
            <CommunityCalendar tenantId={tenantId} />
          ) : (
            <div className="space-y-8">
              {/* Community Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl ${communities.find(c => c.id === selectedCommunity)?.bg}`}>
                    {(() => {
                      const Icon = communities.find(c => c.id === selectedCommunity)?.icon || Building2
                      const color = communities.find(c => c.id === selectedCommunity)?.color || 'text-slate-600'
                      return <Icon className={`w-8 h-8 \${color}`} />
                    })()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">
                      {communities.find(c => c.id === selectedCommunity)?.name}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] uppercase">Active Community</Badge>
                      <span className="text-sm text-slate-500 font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" /> {filteredMembers.length} Members
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {/* View Toggle */}
                  <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
                    <button
                      onClick={() => { setActiveView('dashboard'); setSelectedMemberId(null) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeView === 'dashboard'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
                    </button>
                    <button
                      onClick={() => { setActiveView('calendar'); setSelectedMemberId(null) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        activeView === 'calendar'
                          ? 'bg-white text-slate-800 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <CalendarDays className="w-3.5 h-3.5" /> Calendar
                    </button>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Activity className="w-4 h-4" /> Activity Logs
                  </Button>
                  <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Handshake className="w-4 h-4" /> Log Interaction
                  </Button>
                  <DataImportButton />
                </div>
              </div>

              {/* Stats Panel */}
              <div>
                <div className="mb-4">
                  <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Community Performance
                  </h2>
                </div>
                <SimpleAnalyticsCards />
              </div>

              {/* Member Intelligence Feed */}
              {filteredMembers.length > 0 && (
                <MemberIntelFeed
                  members={filteredMembers}
                  onViewProfile={(id) => setSelectedMemberId(id)}
                />
              )}

              {/* Relationship Heatmap */}
              <div>
                <RelationshipHeatmap />
              </div>

              {/* Leaderboards (Excel KPIs) */}
              <LeaderboardPanel />

              {/* Quick Actions / Activity Callout */}
              <Card className="bg-slate-900 border-slate-800 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <Network className="w-32 h-32 text-blue-400" />
                </div>
                <CardContent className="p-8">
                  <div className="max-w-xl">
                    <h3 className="text-xl font-bold text-white mb-2">Grow your network ROI</h3>
                    <p className="text-slate-400 mb-6">
                      Track your 1-to-1 meetings and referrals to see the real impact of your community involvement.
                    </p>
                    <div className="flex gap-3">
                      <Button
                        className="bg-blue-600 hover:bg-blue-700 font-semibold gap-2"
                        onClick={() => setShowNetworkGraph(true)}
                      >
                        View Network Graph <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>

    {showNetworkGraph && (
      <NetworkGrowthGraph onClose={() => setShowNetworkGraph(false)} />
    )}
    </>
  )
}
