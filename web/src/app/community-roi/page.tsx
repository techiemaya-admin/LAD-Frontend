'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Users,
  MessageSquare,
  Network,
  Search,
  ChevronRight,
  Building2,
  Phone,
  Linkedin,
  Trophy,
  ArrowUpRight,
  UserPlus,
  CalendarDays,
  LayoutDashboard,
  Pin,
  PinOff,
  X,
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

  // Sidebar state
  const [sidebarVisible, setSidebarVisible] = useState(true)
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('sidebar-pinned') !== 'false'
  })

  // Immediate auto-hide sidebar logic
  useEffect(() => {
    const handleMainContentInteraction = (e: Event) => {
      // Don't hide if sidebar is pinned
      if (sidebarPinned) return

      // Check if the click/interaction is outside the sidebar
      const target = e.target as HTMLElement
      const sidebar = document.querySelector('[data-sidebar="true"]')

      if (sidebar && !sidebar.contains(target)) {
        // Click/interaction is in main content area - hide sidebar immediately
        setSidebarVisible(false)
      }
    }

    const handleShowSidebar = (e: Event) => {
      // Show sidebar when clicking the floating button or in sidebar area
      const target = e.target as HTMLElement
      const floatingBtn = document.querySelector('[data-sidebar-toggle="true"]')
      const sidebar = document.querySelector('[data-sidebar="true"]')

      if (floatingBtn?.contains(target) || sidebar?.contains(target)) {
        setSidebarVisible(true)
      }
    }

    window.addEventListener('click', handleMainContentInteraction)
    window.addEventListener('scroll', handleMainContentInteraction)

    return () => {
      window.removeEventListener('click', handleMainContentInteraction)
      window.removeEventListener('scroll', handleMainContentInteraction)
    }
  }, [sidebarPinned])

  // Handle sidebar pin toggle
  const handleTogglePin = () => {
    const newPinned = !sidebarPinned
    setSidebarPinned(newPinned)
    localStorage.setItem('sidebar-pinned', newPinned ? 'true' : 'false')
    setSidebarVisible(true) // Show sidebar when pinning
  }

  // Get tenant ID from environment or props (without Redux dependency)
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || '';
  const { data: members, isLoading: membersLoading } = useListMembers({ tenantId })

  const communities = [
    { id: 'BNI', name: 'BNI Rising Phoenix', icon: Building2, logo: '/assets/community-logos/bni-logo.svg', color: 'text-red-600', bg: 'bg-red-50' },
    { id: 'WhatsApp', name: 'WhatsApp Group', icon: Phone, color: 'text-green-600', bg: 'bg-green-50' },
    { id: 'LinkedIn', name: 'LinkedIn Network', icon: Linkedin, color: 'text-blue-600', bg: 'bg-blue-50' },
  ]

  const filteredMembers = Array.isArray(members) 
    ? members.filter((m: any) => (m.name || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : []

  return (
    <>
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      {/* Member Sidebar */}
      <div
        data-sidebar="true"
        className={`${sidebarVisible ? 'w-80' : 'w-0'} border-r bg-white flex flex-col shrink-0 transition-all duration-300 overflow-hidden shadow-lg ${!sidebarVisible && !sidebarPinned ? 'absolute left-0 top-0 bottom-0 z-50' : ''}`}
      >
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
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-lg text-slate-800">Members</h2>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-mono text-[10px] uppercase tracking-wider">
                {filteredMembers.length} Total
              </Badge>
              <button
                onClick={handleTogglePin}
                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar'}
              >
                {sidebarPinned ? (
                  <Pin className="w-4 h-4 fill-slate-600 text-slate-600" />
                ) : (
                  <PinOff className="w-4 h-4" />
                )}
              </button>
              {!sidebarPinned && (
                <button
                  onClick={() => setSidebarVisible(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
                  title="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
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
            <CommunityCalendar tenantId={tenantId} onBack={() => setActiveView('dashboard')} />
          ) : (
            <div className="space-y-8">
              {/* Community Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-2xl border border-slate-200 shadow-sm gap-4">
                <div className="flex items-center gap-4">
                  {(() => {
                    const community = communities.find(c => c.id === selectedCommunity)
                    if (community?.logo) {
                      return (
                        <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg bg-white flex items-center justify-center">
                          <img src={community.logo} alt={community.name} className="w-full h-full object-contain p-2" />
                        </div>
                      )
                    }
                    return (
                      <div className={`p-4 rounded-2xl ${community?.bg}`}>
                        {(() => {
                          const Icon = community?.icon || Building2
                          const color = community?.color || 'text-slate-600'
                          return <Icon className={`w-8 h-8 ${color}`} />
                        })()}
                      </div>
                    )
                  })()}
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
                  <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <UserPlus className="w-4 h-4" /> Onboard New Member
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

    {/* Floating button to show sidebar when hidden */}
    {!sidebarVisible && !sidebarPinned && (
      <button
        data-sidebar-toggle="true"
        onClick={() => setSidebarVisible(true)}
        className="fixed left-4 top-4 p-3 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all z-40"
        title="Show members sidebar"
      >
        <Users className="w-5 h-5" />
      </button>
    )}

    {showNetworkGraph && (
      <NetworkGrowthGraph onClose={() => setShowNetworkGraph(false)} />
    )}
    </>
  )
}
