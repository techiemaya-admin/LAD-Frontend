'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Users,
  MessageSquare,
  Handshake,
  TrendingUp,
  Calendar,
  ArrowLeft,
  Mail,
  MapPin,
  ExternalLink,
  Target,
  ArrowUpRight,
  Flame,
  Sparkles,
  Copy,
  Check,
  Building2,
  Trophy,
  Newspaper,
  Loader2,
  ChevronDown,
  ChevronUp,
  Zap
} from 'lucide-react'
import {
  useMember,
  useMemberRelationships,
  useMemberReferrals,
  useMemberRecentActivity,
  useMemberActivityHistory
} from '@lad/frontend-features/community-roi'
import { OutreachAnalysis } from './OutreachAnalysis'
import { EngagementFeed } from './EngagementFeed'
import { ActivityHeatmap } from './ActivityHeatmap'
import { UUID } from '@lad/frontend-features/community-roi/types'
import { formatDistanceToNow, format, parseISO } from 'date-fns'
import { useMemo, useState, useEffect, useCallback } from 'react'

interface MemberStats {
  total_meetings: number
  unique_partners: number
  last_meeting_at: string | null
  referrals_given: number
  referrals_received: number
}

interface ResearchData {
  company_profile: Record<string, any> | null
  profile_summary: Record<string, any> | null
  web_presence: Record<string, any> | null
  recent_posts: Array<Record<string, any>>
  icp_score: number | null
  cached: boolean
  credit_deducted: number
  data_age_days: number | null
}

interface DraftMessage {
  message: string
  type: string
}

interface MemberProfileViewProps {
  memberId: UUID
  onBack: () => void
}

export default function MemberProfileView({ memberId, onBack }: MemberProfileViewProps) {
  const { data: member, isLoading: memberLoading } = useMember(memberId)
  const { data: relationships } = useMemberRelationships(memberId)
  const { data: referrals } = useMemberReferrals(memberId)
  const { activity } = useMemberRecentActivity(memberId)
  const { history } = useMemberActivityHistory(memberId)

  // Live stats fetched directly from interaction/referral tables
  const [memberStats, setMemberStats] = useState<MemberStats | null>(null)

  // Contribution Report collapsed state (starts expanded)
  const [contributionCollapsed, setContributionCollapsed] = useState(true)

  // Research Intelligence state
  const [researchData, setResearchData] = useState<ResearchData | null>(null)
  const [researchLoading, setResearchLoading] = useState(false)
  const [draftMessage, setDraftMessage] = useState<DraftMessage | null>(null)
  const [draftLoading, setDraftLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!memberId) return
    const fetchStats = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const baseURL =
          typeof window !== 'undefined' && window.location.hostname === 'localhost'
            ? `${window.location.origin}/api/community-roi`
            : `https://lad-backend-develop-160078175457.us-central1.run.app/api/community-roi`
        const res = await fetch(`${baseURL}/members/${memberId}/stats`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: 'include',
        })
        if (res.ok) {
          const json = await res.json()
          setMemberStats(json.data)
        }
      } catch {
        // Stats are supplementary — silently degrade to member row data
      }
    }
    fetchStats()
  }, [memberId])

  // Auto-trigger research when a new member profile opens
  useEffect(() => {
    if (!member) return
    setResearchData(null)
    setDraftMessage(null)
    runResearch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId])

  // ── Research Intelligence ──────────────────────────────────────────────────
  const getBaseURL = useCallback(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    const base = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? window.location.origin
      : 'https://lad-backend-develop-160078175457.us-central1.run.app'
    return { base, token }
  }, [])

  const runResearch = useCallback(async () => {
    if (!member) return
    setResearchLoading(true)
    setResearchData(null)
    setDraftMessage(null)
    try {
      const { base, token } = getBaseURL()
      const res = await fetch(`${base}/api/campaigns/search-prospects/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: `community-roi-${memberId}`,
          moduleUsed: 'community_roi',
          lead: {
            name: member.name,
            profile_url: (member as any).linkedin_url || null,
            current_company: member.company_name || null,
            headline: member.designation || null,
            location: 'Dubai, UAE',
          },
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setResearchData(json)
      }
    } catch {
      // silently degrade
    } finally {
      setResearchLoading(false)
    }
  }, [member, memberId, getBaseURL])

  const generateDraftMessage = useCallback(async () => {
    if (!member) return
    setDraftLoading(true)
    try {
      const { base, token } = getBaseURL()

      // Build an enriched value_prop from research if available
      let valueProp = `BNI Rising Phoenix 1-2-1 meeting to explore business synergies between our networks`
      if (researchData?.company_profile) {
        const cp = researchData.company_profile
        const industry = cp.industry || cp.sector || ''
        const description = cp.description || cp.short_description || ''
        if (industry) valueProp += `. ${member.name} specialises in ${industry}`
        if (description) valueProp += `. ${String(description).slice(0, 120)}`
      }

      const res = await fetch(`${base}/api/campaigns/generate-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          type: 'connection_request',
          targeting: {
            job_titles: [member.designation || 'Business Owner'],
            industries: [],
            locations: ['Dubai, UAE'],
          },
          context: {
            value_prop: valueProp,
            recipient_name: member.name,
            recipient_company: member.company_name || '',
            tone: 'casual',
            goal: 'get_meeting',
            custom_context: `This is a BNI chapter 1-2-1 meeting request within BNI Rising Phoenix. Keep it warm and personal. Reference the member's company ${member.company_name || ''} and suggest a 20-minute coffee chat.${researchData?.recent_posts?.length ? ` Optionally reference a recent activity or post.` : ''}`,
          },
        }),
      })
      if (res.ok) {
        const json = await res.json()
        setDraftMessage({
          message: json.message || json.content || json.data?.message || '',
          type: 'connection_request',
        })
      }
    } catch {
      // silently degrade
    } finally {
      setDraftLoading(false)
    }
  }, [member, researchData, getBaseURL])

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
    }
  }, [])

  // Calculate dynamic KPIs — prefer live stats over denormalized member totals
  const kpis = useMemo(() => {
    if (!member) return null;

    // Use live interaction stats when available, fall back to member row
    const meetingsCount = memberStats?.total_meetings ?? member.total_one_to_ones ?? 0;
    const referralsGiven = memberStats?.referrals_given ?? member.total_referrals_given ?? 0;
    const referralsReceived = memberStats?.referrals_received ?? member.total_referrals_received ?? 0;
    const uniquePartners = memberStats?.unique_partners ?? 0;
    const businessValue = member.total_business_inside_aed || 0;

    // Use weightings aligned with BNI Rising Phoenix analysis
    // OTO (15) + RefGiven (25) + RefReceived (10) + Revenue (Value/500)
    const impactScore = Math.floor(
      (meetingsCount * 15) +
      (referralsGiven * 25) +
      (referralsReceived * 10) +
      (businessValue / 500)
    );

    // Network strength based on engagement vs chapter size (simulated 92 members)
    const targetOTO = 20;
    const targetRef = 15;
    const networkStrength = Math.min(100, Math.floor(((meetingsCount / targetOTO) * 50) + ((referralsGiven / targetRef) * 50)));

    return {
      meetingsCount,
      referralsGiven,
      referralsReceived,
      uniquePartners,
      businessValue,
      impactScore,
      networkStrength
    };
  }, [member, memberStats]);

  const lastInteractionDate = useMemo(() => {
    if (!activity?.[0]) return 'No activity yet';
    try {
      return formatDistanceToNow(parseISO(activity[0].created_at), { addSuffix: true });
    } catch (e) {
      return 'Recently';
    }
  }, [activity]);

  if (memberLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!member) {
      return <div>Member not found</div>
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      {/* Navigation & Actions */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2 text-slate-600 hover:text-slate-900 group">
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Dashboard
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" size="sm" className="gap-2 rounded-lg border-slate-200 shadow-sm">
            <Mail className="w-4 h-4 text-slate-500" /> Share Insights
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={runResearch}
            disabled={researchLoading}
            className="gap-2 rounded-lg border-violet-200 text-violet-700 hover:bg-violet-50 shadow-sm"
          >
            {researchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {researchLoading ? 'Researching…' : 'Research'}
          </Button>
          <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-100 rounded-lg">
            <Calendar className="w-4 h-4" /> Book 1-to-1
          </Button>
        </div>
      </div>

      {/* Hero Profile Section */}
      <div className="relative">
        <div className="h-48 rounded-[2rem] bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-950 shadow-2xl" />
        <div className="px-8 -mt-20">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end bg-white/5 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shadow-2xl">
            <div className="w-40 h-40 rounded-[2.5rem] bg-gradient-to-br from-white to-slate-100 p-1 shadow-2xl ring-4 ring-white/10">
              <div className="w-full h-full bg-slate-50 rounded-[2.4rem] flex items-center justify-center text-5xl font-bold text-slate-300">
                {member.name.split(' ').map((n: any) => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            </div>
            
            <div className="flex-1 pb-2">
              <div className="flex flex-col mb-4">
                <div className="flex items-center gap-4">
                  <h1 className="text-4xl font-bold text-slate-900 tracking-tight">{member.name}</h1>
                  <Badge className={`${(kpis?.impactScore || 0) > 500 ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'} font-bold px-4 py-1 rounded-full border-none shadow-lg whitespace-nowrap`}>
                    {(kpis?.impactScore || 0) > 500 ? 'Top Contributor' : 'Active Member'}
                  </Badge>
                  {member.current_streak > 0 && (
                    <div className="flex items-center gap-1.5 bg-orange-500/10 text-orange-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest animate-pulse border border-orange-200">
                      <Flame className="w-4 h-4 fill-orange-500 animate-bounce" />
                      {member.current_streak} Day Streak
                    </div>
                  )}
                </div>
                <p className="text-2xl font-semibold text-slate-500 tracking-tight mt-1">({member.company_name || 'BNI Rising Phoenix'})</p>
              </div>
              <div className="flex flex-wrap gap-6 text-slate-400 font-medium text-sm">
                <span className="flex items-center gap-2.5"><Target className="w-4 h-4 text-slate-300" /> {member.designation || 'Member'}</span>
                <span className="flex items-center gap-2.5"><MapPin className="w-4 h-4 text-slate-300" /> Dubai, UAE</span>
                <span className="flex items-center gap-2.5"><Mail className="w-4 h-4 text-slate-300" /> {member.email || 'N/A'}</span>
              </div>
            </div>

            <div className="flex gap-4 pb-2">
              <Button variant="outline" size="icon" className="w-14 h-14 bg-white border-slate-200 text-slate-400 rounded-2xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
                <ExternalLink className="w-6 h-6" />
              </Button>
              <Button className="h-14 px-8 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-900/40 transition-all hover:-translate-y-1">
                Book 1-to-1
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Contribution Metrics - High Fidelity Fin-Style Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 px-4">

        {/* Card 1: Referrals Given OR Unique Partners (if no referrals yet) */}
        {(kpis?.referralsGiven ?? 0) > 0 ? (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 mb-1">
              <Handshake className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Referrals Given</span>
            <span className="text-4xl font-bold text-emerald-600">+{kpis?.referralsGiven}</span>
            <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-50/50 px-3 py-1 rounded-full">
              <ArrowUpRight className="w-3.5 h-3.5" /> Active Giver
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600 mb-1">
              <Users className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Unique Partners</span>
            <span className="text-4xl font-bold text-violet-600">{kpis?.uniquePartners ?? 0}</span>
            <Badge variant="outline" className="text-[10px] font-semibold uppercase px-3 py-0.5 text-slate-400 border-slate-200">1-to-1 Network</Badge>
          </div>
        )}

        {/* Card 2: Meetings Logged (from live interaction data) */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 mb-1">
            <MessageSquare className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Meetings Logged</span>
          <span className="text-4xl font-bold text-blue-600">+{kpis?.meetingsCount ?? 0}</span>
          <Badge variant="outline" className="text-[10px] font-semibold uppercase px-3 py-0.5 text-slate-400 border-slate-200">Target: 20+</Badge>
        </div>

        {/* Card 3: Growth Streak */}
        <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all group">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Growth Streak</span>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black text-orange-500 italic">{member?.current_streak || 0}</span>
            <Flame className="w-6 h-6 text-orange-500 fill-orange-500 animate-pulse group-hover:scale-125 transition-transform" />
          </div>
          {(member?.current_streak || 0) === 0 ? (
            <span className="text-[10px] font-bold text-slate-400 uppercase italic">Log a meeting to start</span>
          ) : (
            <span className="text-[10px] font-bold text-slate-400 uppercase">Best: {member?.max_streak || 0}</span>
          )}
        </div>

        {/* Card 4: Business Value OR Last 1-to-1 date (if value is 0) */}
        {(kpis?.businessValue ?? 0) > 0 ? (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="p-2.5 rounded-xl bg-slate-50 text-slate-900 mb-1">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Business Value</span>
            <span className="text-4xl font-bold text-slate-900">AED {(kpis?.businessValue).toLocaleString()}</span>
            <span className="text-[11px] font-medium text-slate-400 italic">Net Generated Impact</span>
          </div>
        ) : (
          <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center space-y-2 hover:shadow-xl hover:-translate-y-1 transition-all">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 mb-1">
              <Calendar className="w-6 h-6" />
            </div>
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Last 1-to-1</span>
            {memberStats?.last_meeting_at ? (
              <>
                <span className="text-2xl font-bold text-amber-600 leading-tight">
                  {format(new Date(memberStats.last_meeting_at), 'MMM d')}
                </span>
                <span className="text-[11px] font-medium text-slate-400 italic">
                  {formatDistanceToNow(new Date(memberStats.last_meeting_at), { addSuffix: true })}
                </span>
              </>
            ) : (
              <>
                <span className="text-2xl font-bold text-slate-300 leading-tight">—</span>
                <span className="text-[11px] font-medium text-slate-400 italic">No meetings yet</span>
              </>
            )}
          </div>
        )}

        {/* Card 5: Total Impact Score */}
        <div className="bg-blue-600 rounded-[2rem] p-8 shadow-2xl shadow-blue-200 flex flex-col items-center justify-center text-center space-y-2 hover:scale-[1.02] transition-all">
          <div className="p-2.5 rounded-xl bg-white/10 text-blue-100 mb-1">
            <Target className="w-6 h-6" />
          </div>
          <span className="text-[11px] font-bold text-blue-100/80 uppercase tracking-widest">Total Impact Score</span>
          <span className="text-5xl font-bold text-white tracking-tight">{kpis?.impactScore ?? 0}</span>
          <div className="text-[11px] font-bold text-blue-200 uppercase tracking-tighter">
            {(kpis?.impactScore ?? 0) === 0 ? 'Building Profile' : 'Elite Member Status'}
          </div>
        </div>
      </div>

      {/* Contribution Report / Heatmap Section */}
      <Card className="rounded-[2.5rem] border-slate-100 shadow-xl overflow-hidden bg-white">
        <CardHeader className="p-8 pb-0 border-none">
          <div className="flex items-start justify-between gap-6">
            {/* Left: title + pills row */}
            <div className="flex flex-col gap-4">
              <div>
                <CardTitle className="text-3xl font-bold text-slate-900 tracking-tight">Contribution Report</CardTitle>
                {!contributionCollapsed && (
                  <CardDescription className="text-slate-500 font-medium text-base mt-1">Weekly engagement footprint and revenue impact analysis</CardDescription>
                )}
              </div>
              {!contributionCollapsed && (
                <div className="flex flex-wrap gap-3">
                  <div className="px-5 py-2.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Segment</span>
                    <span className="text-sm font-bold text-slate-700">All Communities</span>
                  </div>
                  <div className="px-5 py-2.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Period</span>
                    <span className="text-sm font-bold text-slate-700">Last 12 Months</span>
                  </div>
                </div>
              )}
            </div>

            {/* Right: toggle always anchored top-right */}
            <button
              onClick={() => setContributionCollapsed(v => !v)}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-slate-100 transition-colors text-slate-500 hover:text-slate-800 text-xs font-bold uppercase tracking-widest"
            >
              {contributionCollapsed
                ? <><ChevronDown className="w-4 h-4" /> Expand</>
                : <><ChevronUp className="w-4 h-4" /> Collapse</>
              }
            </button>
          </div>
        </CardHeader>
        <CardContent className={contributionCollapsed ? 'p-8 pt-6' : 'p-8 pt-10'}>
          <ActivityHeatmap data={history || []} member={member} isCollapsed={contributionCollapsed} />
        </CardContent>
      </Card>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-4 md:px-0">

        {/* Main Column - Insights & Analytics */}
        <div className="lg:col-span-8 space-y-8">

          {/* Outreach Analysis Component */}
          <OutreachAnalysis memberId={memberId} />

          {/* ── Member Intelligence Section ─────────────────────────────── */}
          <Card className="rounded-[2rem] border-slate-100 shadow-sm overflow-hidden bg-white">
            <CardHeader className="p-6 pb-4 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-100 text-violet-600">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-slate-900">Member Intelligence</CardTitle>
                    <CardDescription className="text-slate-400 text-xs font-medium mt-0.5">
                      Latest achievements, posts &amp; company signals
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {researchData?.cached && (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                      {researchData.data_age_days != null ? `${researchData.data_age_days}d ago` : 'Cached'}
                    </Badge>
                  )}
                  <button
                    onClick={runResearch}
                    disabled={researchLoading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                  >
                    {researchLoading
                      ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Researching…</>
                      : <><Sparkles className="w-3.5 h-3.5" /> Refresh</>
                    }
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {/* Loading state */}
              {researchLoading && !researchData && (
                <div className="space-y-4 animate-pulse">
                  <div className="grid grid-cols-3 gap-4">
                    {[1,2,3].map(i => <div key={i} className="h-20 bg-slate-100 rounded-2xl" />)}
                  </div>
                  <div className="h-24 bg-slate-100 rounded-2xl" />
                  <div className="h-16 bg-slate-100 rounded-2xl" />
                </div>
              )}

              {/* No data yet */}
              {!researchLoading && !researchData && (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                  <div className="p-4 rounded-2xl bg-violet-50 text-violet-400">
                    <Sparkles className="w-8 h-8" />
                  </div>
                  <p className="text-sm font-semibold text-slate-500">Research is loading…</p>
                  <p className="text-xs text-slate-400">Company intel, social posts and achievements will appear here.</p>
                </div>
              )}

              {/* Research data */}
              {researchData && (
                <div className="space-y-6">

                  {/* ── Company snapshot row ─────────────────────────────── */}
                  {researchData.company_profile && (() => {
                    const cp = researchData.company_profile
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Industry */}
                        {(cp.industry || cp.sector) && (
                          <div className="bg-blue-50 rounded-2xl p-4 space-y-1 border border-blue-100/60">
                            <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                              <Building2 className="w-3 h-3" /> Industry
                            </p>
                            <p className="text-sm font-bold text-blue-800">{cp.industry || cp.sector}</p>
                          </div>
                        )}
                        {/* Employees */}
                        {cp.employee_count && (
                          <div className="bg-slate-50 rounded-2xl p-4 space-y-1 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Users className="w-3 h-3" /> Team Size
                            </p>
                            <p className="text-sm font-bold text-slate-800">{Number(cp.employee_count).toLocaleString()} employees</p>
                          </div>
                        )}
                        {/* Founded */}
                        {cp.founded_year && (
                          <div className="bg-slate-50 rounded-2xl p-4 space-y-1 border border-slate-100">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Founded
                            </p>
                            <p className="text-sm font-bold text-slate-800">{cp.founded_year}</p>
                          </div>
                        )}
                        {/* Hiring signal */}
                        {cp.hiring_signals?.is_hiring && (
                          <div className="bg-emerald-50 rounded-2xl p-4 space-y-1 border border-emerald-100">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Signal</p>
                            <p className="text-sm font-bold text-emerald-700">🚀 Actively Hiring</p>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* ── Company description ──────────────────────────────── */}
                  {(researchData.company_profile?.description || researchData.company_profile?.short_description || researchData.profile_summary?.summary || researchData.profile_summary?.about) && (
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Building2 className="w-3 h-3" /> About
                      </p>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {String(
                          researchData.company_profile?.description ||
                          researchData.company_profile?.short_description ||
                          researchData.profile_summary?.summary ||
                          researchData.profile_summary?.about
                        ).slice(0, 400)}
                      </p>
                    </div>
                  )}

                  {/* ── Recent News ──────────────────────────────────────── */}
                  {Array.isArray(researchData.company_profile?.recent_news) && researchData.company_profile.recent_news.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Newspaper className="w-3 h-3" /> Recent News &amp; Achievements
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {researchData.company_profile.recent_news.slice(0, 4).map((news: any, i: number) => (
                          <div key={i} className="flex gap-3 bg-white rounded-xl border border-slate-100 p-4 hover:border-slate-200 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <Trophy className="w-4 h-4" />
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed line-clamp-3">
                              {news.title || news.headline || String(news).slice(0, 120)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── LinkedIn Posts ───────────────────────────────────── */}
                  {Array.isArray(researchData.recent_posts) && researchData.recent_posts.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" /> Recent Social Posts
                      </p>
                      <div className="space-y-3">
                        {researchData.recent_posts.slice(0, 3).map((post: any, i: number) => {
                          const text = post.text || post.content || post.body || ''
                          if (!text) return null
                          return (
                            <div key={i} className="bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 p-4 hover:border-violet-100 transition-colors">
                              <div className="flex items-start gap-3">
                                <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center flex-shrink-0 mt-0.5 text-[10px] font-black">
                                  {i + 1}
                                </div>
                                <p className="text-xs text-slate-700 leading-relaxed italic line-clamp-4">
                                  "{String(text).slice(0, 280)}"
                                </p>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── Web Presence ─────────────────────────────────────── */}
                  {researchData.web_presence && Object.keys(researchData.web_presence).length > 0 && (
                    (researchData.web_presence.website || researchData.web_presence.twitter || researchData.web_presence.summary) && (
                      <div className="space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Web Presence
                        </p>
                        <div className="flex flex-wrap gap-3">
                          {researchData.web_presence.website && (
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600">
                              🌐 {String(researchData.web_presence.website).replace(/^https?:\/\//, '').slice(0, 40)}
                            </div>
                          )}
                          {researchData.web_presence.twitter && (
                            <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600">
                              𝕏 {researchData.web_presence.twitter}
                            </div>
                          )}
                        </div>
                        {researchData.web_presence.summary && (
                          <p className="text-xs text-slate-500 leading-relaxed">
                            {String(researchData.web_presence.summary).slice(0, 250)}
                          </p>
                        )}
                      </div>
                    )
                  )}

                  {/* ── Next Best Actions ────────────────────────────────── */}
                  {Array.isArray(researchData.company_profile?.metadata?.next_best_actions) &&
                    researchData.company_profile.metadata.next_best_actions.length > 0 && (
                    <div className="bg-violet-50 rounded-2xl p-5 border border-violet-100 space-y-2">
                      <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" /> Suggested Actions
                      </p>
                      <ul className="space-y-2">
                        {researchData.company_profile.metadata.next_best_actions.slice(0, 3).map((action: any, i: number) => (
                          <li key={i} className="text-xs text-violet-800 leading-relaxed flex gap-2">
                            <span className="text-violet-400 font-bold">→</span>
                            {typeof action === 'string' ? action : action.action || String(action).slice(0, 100)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}
            </CardContent>
          </Card>

        </div>

        {/* Right Sidebar - Feed & More */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Quick Actions / Bio */}
          <Card className="rounded-[1.5rem] border-slate-100 shadow-sm">
            <CardContent className="p-8 space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Member Insights</h3>
                <p className="text-slate-600 leading-relaxed text-sm">
                  {member.name} is a {kpis?.impactScore && kpis.impactScore > 500 ? 'leading contributor' : 'dedicated member'} within the {member.company_name} ecosystem. 
                  Maintaining a network strength of {kpis?.networkStrength || 0}%, they have generated approximately 
                  AED {(kpis?.businessValue || 0).toLocaleString()} in business value through {kpis?.referralsGiven || 0} referrals.
                </p>
              </div>
              <div className="pt-6 border-t border-slate-50 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Join Date</span>
                  <span className="text-slate-900 font-black">{new Date(member.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Last Interaction</span>
                  <span className="text-slate-900 font-black">{lastInteractionDate}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Engagement Feed Component */}
          <Card className="rounded-[1.5rem] border-slate-100 shadow-sm">
            <CardContent className="p-8">
              <EngagementFeed memberId={memberId} />
            </CardContent>
          </Card>

          {/* Community Health / Badge Section from screenshot */}
          <div className="bg-slate-900 rounded-[2rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-blue-600/40 transition-colors" />
            <div className="relative z-10 space-y-6">
              <div>
                <h4 className="text-xs font-black text-blue-400 uppercase tracking-[0.2em] mb-2">Network Health</h4>
                <div className="flex items-end gap-3">
                  <span className="text-5xl font-black">{kpis?.networkStrength || 0}</span>
                  <span className="text-blue-400 font-bold mb-2 uppercase text-xs tracking-widest">
                    {(kpis?.networkStrength || 0) > 85 ? 'Excellent' : (kpis?.networkStrength || 0) > 60 ? 'Good' : 'Growing'}
                  </span>
                </div>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${kpis?.networkStrength || 0}%` }} />
              </div>
              <p className="text-white/60 text-xs font-medium leading-relaxed">
                This member is currently in the {(kpis?.impactScore || 0) > 700 ? 'top 5%' : 'top 20%'} of community contributors based on cross-platform engagement and revenue generation.
              </p>
            </div>
          </div>

          {/* ── Draft 1-2-1 Message ──────────────────────────────────────── */}
          <Card className="rounded-[1.5rem] border-violet-100 shadow-sm bg-gradient-to-br from-violet-50/40 to-white">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-violet-100 text-violet-600">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Draft 1-2-1 Message</h3>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Generate a personalised opener using {member?.name?.split(' ')[0]}&apos;s latest research and company signals.
              </p>
              <Button
                size="sm"
                onClick={generateDraftMessage}
                disabled={draftLoading || researchLoading}
                className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md shadow-violet-100 font-bold"
              >
                {draftLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                {draftLoading ? 'Drafting…' : researchLoading ? 'Waiting for research…' : 'Draft Message'}
              </Button>
              {draftMessage?.message && (
                <div className="relative bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap pr-6">
                    {draftMessage.message}
                  </p>
                  <button
                    onClick={() => copyToClipboard(draftMessage.message)}
                    className="absolute top-3 right-3 text-slate-400 hover:text-slate-700 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
