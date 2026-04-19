'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Loader2,
  Trophy,
  ChevronDown,
  RefreshCw,
  TrendingUp,
  Users,
  Building2,
  MapPin,
  DollarSign,
  Globe,
} from 'lucide-react'

interface Member {
  id: string
  name: string
  company_name?: string
  designation?: string
  email?: string
  linkedin_url?: string
}

// Shape of the ABM data object returned by POST /api/abm/research
interface ABMData {
  id?: string
  company_name?: string
  industry?: string
  sub_industry?: string
  headquarters?: string
  description?: string
  company_overview?: string
  company_size_range?: string
  employee_count_estimate?: number
  founded_year?: number
  funding_stage?: string
  recent_funding?: Array<{ title?: string; snippet?: string; source?: string; date?: string }>
  recent_activities?: Array<{ title?: string; snippet?: string; url?: string; date?: string }>
  recent_achievements?: Array<{ title?: string; snippet?: string }>
  key_decision_makers?: Array<{
    name?: string
    title?: string
    linkedin_url?: string
    icp_score?: number
    icp_rationale?: string
    department?: string
    seniority_level?: string
  }>
  linkedin_url?: string
  linkedin_followers?: number
  twitter_url?: string
  website?: string
  web_presence?: Record<string, any>
  metadata?: {
    next_best_actions?: Array<{
      action?: string
      priority?: number
      rationale?: string
      channel?: string
      target_person?: string
      suggested_message_hook?: string
    }>
  }
  enrichment_status?: string
  last_enriched_at?: string
}

interface IntelData {
  abmData: ABMData | null
  nextBestActions: Array<Record<string, any>>
  cached: boolean
  status: 'idle' | 'loading' | 'researching' | 'done' | 'error'
  errorMsg?: string
}

interface MemberIntelCardProps {
  member: Member
  onViewProfile: (id: string) => void
}

function MemberIntelCard({ member, onViewProfile }: MemberIntelCardProps) {
  const [intel, setIntel] = useState<IntelData>({
    abmData: null,
    nextBestActions: [],
    cached: false,
    status: 'idle',
  })
  const cardRef = useRef<HTMLDivElement>(null)
  const fetchedRef = useRef(false)

  // Shared helper — reads token from cookie (safeStorage) or localStorage fallback
  const getToken = () =>
    typeof window !== 'undefined'
      ? (document.cookie.match(/(?:^|;\s*)token=([^;]+)/)?.[1] || localStorage.getItem('token'))
      : null

  // ── GET: read prospect_companies cache — instant, no external API calls ──────
  const loadCached = useCallback(async () => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    if (!member.company_name) {
      // No company name — nothing to look up, show Research button immediately
      setIntel(prev => ({ ...prev, status: 'done' }))
      return
    }
    setIntel(prev => ({ ...prev, status: 'loading', errorMsg: undefined }))
    try {
      const token  = getToken()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const params = new URLSearchParams({ company_name: member.company_name! })
      const res = await fetch(`${origin}/api/community-roi/member-intel?${params}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        const abmData: ABMData | null = json.data || null
        setIntel({
          abmData,
          nextBestActions: json.next_best_actions || abmData?.metadata?.next_best_actions || [],
          cached: !!abmData,
          status: 'done',
        })
      } else {
        setIntel(prev => ({ ...prev, status: 'done', abmData: null }))
      }
    } catch {
      setIntel(prev => ({ ...prev, status: 'done', abmData: null }))
    }
  }, [member])

  // ── POST: run full ABM research → updates prospect_companies, returns fresh data ──
  const runResearch = useCallback(async () => {
    setIntel(prev => ({ ...prev, status: 'researching', errorMsg: undefined }))
    try {
      const token  = getToken()
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      const res = await fetch(`${origin}/api/community-roi/member-intel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          name:          member.name,
          company_name:  member.company_name || undefined,
          force_refresh: true,
        }),
      })
      if (res.ok) {
        const json = await res.json()
        const abmData: ABMData = json.data || {}
        setIntel({
          abmData,
          nextBestActions: json.next_best_actions || abmData?.metadata?.next_best_actions || [],
          cached: false,
          status: 'done',
        })
      } else {
        const err = await res.json().catch(() => ({}))
        setIntel(prev => ({ ...prev, status: 'error', errorMsg: err?.error || `Error ${res.status}` }))
      }
    } catch (e: any) {
      setIntel(prev => ({ ...prev, status: 'error', errorMsg: e?.message }))
    }
  }, [member])

  // Lazy-load via IntersectionObserver — read cache when card scrolls into view
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { loadCached(); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadCached])

  const d = intel.abmData
  const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // ── Derived display values ──────────────────────────────────────────────────
  const overview       = d?.company_overview || d?.description || ''
  const industry       = d?.industry || d?.sub_industry || ''
  const hq             = d?.headquarters || ''
  const sizeRange      = d?.company_size_range || ''
  const fundingStage   = d?.funding_stage || ''
  const recentFunding  = (d?.recent_funding  || []).slice(0, 2)
  const achievements   = (d?.recent_achievements  || []).slice(0, 2)
  const topAction      = intel.nextBestActions?.[0]
  const websiteUrl     = d?.website || d?.linkedin_url || ''

  const hasContent = intel.status === 'done' && !!(overview || recentFunding.length || achievements.length || topAction)

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
    >
      {/* ── Card Header ── */}
      <div className="p-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{member.name}</p>
            <p className="text-[11px] text-slate-500 truncate">{member.company_name || '—'}</p>
            {member.designation && (
              <p className="text-[10px] text-slate-400 truncate italic">{member.designation}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {intel.cached && intel.status === 'done' && (
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Cached</span>
          )}
          {(intel.status === 'loading' || intel.status === 'researching') && (
            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
          )}
          {intel.status === 'idle'  && <Sparkles className="w-4 h-4 text-slate-300" />}
          {intel.status === 'done'  && <Sparkles className="w-4 h-4 text-violet-500" />}
          {intel.status === 'error' && <span className="text-[9px] font-bold text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">Error</span>}
        </div>
      </div>

      {/* ── Intel Body ── */}
      <div className="px-5 pb-4 flex-1 space-y-3">

        {/* Loading skeleton — reading cache */}
        {intel.status === 'loading' && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-slate-100 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
          </div>
        )}

        {/* Researching skeleton — running ABM */}
        {intel.status === 'researching' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[11px] text-violet-500 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Running ABM research…
            </div>
            <div className="space-y-1.5 animate-pulse">
              <div className="h-3 bg-violet-50 rounded w-full" />
              <div className="h-3 bg-violet-50 rounded w-4/5" />
              <div className="h-3 bg-violet-50 rounded w-3/4" />
            </div>
          </div>
        )}

        {/* Idle */}
        {intel.status === 'idle' && (
          <p className="text-[11px] text-slate-400 italic">Loading on scroll…</p>
        )}

        {/* Error */}
        {intel.status === 'error' && (
          <div className="space-y-1">
            {intel.errorMsg && (
              <p className="text-[10px] text-rose-400 truncate">{intel.errorMsg}</p>
            )}
            <button
              onClick={runResearch}
              className="text-[11px] text-rose-500 flex items-center gap-1 hover:underline"
            >
              <RefreshCw className="w-3 h-3" /> Retry research
            </button>
          </div>
        )}

        {/* ── Rich ABM content ── */}
        {hasContent && (
          <>
            {/* Firmographic badges row */}
            <div className="flex flex-wrap gap-1.5">
              {industry && (
                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-100 bg-blue-50 px-2 py-0.5 gap-1">
                  <Building2 className="w-2.5 h-2.5" />{industry}
                </Badge>
              )}
              {hq && (
                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-100 px-2 py-0.5 gap-1">
                  <MapPin className="w-2.5 h-2.5" />{hq}
                </Badge>
              )}
              {sizeRange && (
                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-100 px-2 py-0.5 gap-1">
                  <Users className="w-2.5 h-2.5" />{sizeRange}
                </Badge>
              )}
              {fundingStage && (
                <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-100 bg-emerald-50 px-2 py-0.5 gap-1">
                  <DollarSign className="w-2.5 h-2.5" />{fundingStage}
                </Badge>
              )}
            </div>

            {/* Company overview */}
            {overview && (
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-4">
                {String(overview).slice(0, 280)}
              </p>
            )}

            {/* Recent funding */}
            {recentFunding.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <DollarSign className="w-3 h-3 text-emerald-500" /> Recent Funding
                </p>
                {recentFunding.map((f, i) => (
                  <p key={i} className="text-[11px] text-slate-600 line-clamp-1">
                    💰 {f.title || f.snippet || 'Funding round'}
                  </p>
                ))}
              </div>
            )}

            {/* Achievements */}
            {achievements.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Trophy className="w-3 h-3 text-amber-500" /> Achievements
                </p>
                {achievements.map((a, i) => (
                  <p key={i} className="text-[11px] text-slate-600 line-clamp-1">
                    🏆 {typeof a === 'string' ? a : a.title || a.snippet || ''}
                  </p>
                ))}
              </div>
            )}

            {/* Top next best action */}
            {topAction && (
              <div className="bg-violet-50 rounded-xl border border-violet-100 p-3 space-y-1">
                <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Suggested Action
                </p>
                <p className="text-[11px] font-semibold text-violet-800 leading-snug">
                  {topAction.action}
                </p>
                {topAction.rationale && (
                  <p className="text-[10px] text-violet-600 leading-relaxed line-clamp-2">
                    {topAction.rationale}
                  </p>
                )}
                {topAction.suggested_message_hook && (
                  <p className="text-[10px] text-violet-500 italic line-clamp-2 border-t border-violet-100 pt-1 mt-1">
                    "{topAction.suggested_message_hook}"
                  </p>
                )}
                {topAction.channel && (
                  <span className="inline-flex text-[9px] font-bold text-violet-500 bg-violet-100 px-1.5 py-0.5 rounded-full">
                    via {topAction.channel}
                  </span>
                )}
              </div>
            )}

            {/* Website / social links row */}
            {websiteUrl && (
              <a
                href={websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-600 transition-colors"
              >
                <Globe className="w-3 h-3" />
                <span className="truncate">{websiteUrl.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </>
        )}

        {/* No cached data — prompt user to run research */}
        {intel.status === 'done' && !hasContent && (
          <div className="flex flex-col items-start gap-2 py-1">
            <p className="text-[11px] text-slate-400 italic">No research data yet.</p>
            <button
              onClick={runResearch}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-600 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" /> Run Research
            </button>
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="px-5 py-3 border-t border-slate-50 flex items-center justify-between">
        <button
          onClick={() => onViewProfile(member.id)}
          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <Users className="w-3.5 h-3.5" /> View Profile
        </button>

        {intel.status === 'researching' ? (
          <span className="text-[10px] text-violet-500 flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" /> Researching…
          </span>
        ) : intel.status === 'done' && hasContent ? (
          /* Data exists — show Refresh to re-run ABM */
          <button
            onClick={runResearch}
            className="text-[10px] text-slate-400 hover:text-violet-600 flex items-center gap-1 transition-colors"
            title="Re-run fresh ABM research"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        ) : null}
      </div>
    </div>
  )
}

// ─── Feed container ────────────────────────────────────────────────────────────

interface MemberIntelFeedProps {
  members: Member[]
  onViewProfile: (id: string) => void
}

const PAGE_SIZE = 9

export default function MemberIntelFeed({ members, onViewProfile }: MemberIntelFeedProps) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  const visible = members.slice(0, visibleCount)
  const hasMore = visibleCount < members.length

  return (
    <div className="space-y-6">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-100 text-violet-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Member Intelligence</h2>
            <p className="text-xs text-slate-500 font-medium">
              ABM research — company overview, decision makers &amp; next best actions
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-bold text-violet-600 border-violet-200 px-3">
          {members.length} members
        </Badge>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {visible.map(member => (
          <MemberIntelCard
            key={member.id}
            member={member}
            onViewProfile={onViewProfile}
          />
        ))}
      </div>

      {/* Load more */}
      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
            className="gap-2 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
          >
            <ChevronDown className="w-4 h-4" />
            Load more ({members.length - visibleCount} remaining)
          </Button>
        </div>
      )}
    </div>
  )
}
