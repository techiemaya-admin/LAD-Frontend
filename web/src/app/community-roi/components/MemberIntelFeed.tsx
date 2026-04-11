'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Building2,
  Newspaper,
  Loader2,
  Trophy,
  Zap,
  ChevronDown,
  RefreshCw,
  ExternalLink,
  TrendingUp,
  Users,
} from 'lucide-react'

interface Member {
  id: string
  name: string
  company_name?: string
  designation?: string
  email?: string
  linkedin_url?: string
}

interface IntelData {
  company_profile: Record<string, any> | null
  profile_summary: Record<string, any> | null
  web_presence: Record<string, any> | null
  recent_posts: Array<Record<string, any>>
  cached: boolean
  status: 'idle' | 'loading' | 'done' | 'error'
}

interface MemberIntelCardProps {
  member: Member
  onViewProfile: (id: string) => void
}

function MemberIntelCard({ member, onViewProfile }: MemberIntelCardProps) {
  const [intel, setIntel] = useState<IntelData>({
    company_profile: null,
    profile_summary: null,
    web_presence: null,
    recent_posts: [],
    cached: false,
    status: 'idle',
  })
  const cardRef = useRef<HTMLDivElement>(null)
  const fetchedRef = useRef(false)

  const fetchIntel = useCallback(async () => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    setIntel(prev => ({ ...prev, status: 'loading' }))

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const base = typeof window !== 'undefined' && window.location.hostname === 'localhost'
        ? window.location.origin
        : 'https://lad-backend-develop-160078175457.us-central1.run.app'

      const res = await fetch(`${base}/api/campaigns/search-prospects/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: `community-roi-intel-${member.id}`,
          moduleUsed: 'community_roi_feed',
          lead: {
            name: member.name,
            profile_url: member.linkedin_url || null,
            current_company: member.company_name || null,
            headline: member.designation || null,
            location: 'Dubai, UAE',
          },
        }),
      })

      if (res.ok) {
        const json = await res.json()
        setIntel({
          company_profile: json.company_profile,
          profile_summary: json.profile_summary,
          web_presence: json.web_presence,
          recent_posts: json.recent_posts || [],
          cached: json.cached,
          status: 'done',
        })
      } else {
        setIntel(prev => ({ ...prev, status: 'error' }))
      }
    } catch {
      setIntel(prev => ({ ...prev, status: 'error' }))
    }
  }, [member])

  // Lazy-load via IntersectionObserver — only fetch when card scrolls into view
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { fetchIntel(); observer.disconnect() } },
      { threshold: 0.1 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchIntel])

  const cp = intel.company_profile
  const ps = intel.profile_summary
  const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  // ── Derive highlight snippets ──────────────────────────────────────────────
  const industry = cp?.industry || cp?.sector || ''
  const description = cp?.description || cp?.short_description || ps?.summary || ps?.about || ''
  const isHiring = cp?.hiring_signals?.is_hiring
  const recentNews = Array.isArray(cp?.recent_news) ? cp.recent_news.slice(0, 2) : []
  const latestPost = intel.recent_posts?.[0]
  const postText = latestPost?.text || latestPost?.content || latestPost?.body || ''
  const achievements = Array.isArray(cp?.achievements) ? cp.achievements.slice(0, 2) : []
  const awards = Array.isArray(cp?.awards) ? cp.awards.slice(0, 2) : []
  const nextActions = Array.isArray(cp?.metadata?.next_best_actions)
    ? cp.metadata.next_best_actions.slice(0, 1)
    : []

  const hasContent = intel.status === 'done' && (description || recentNews.length || postText || isHiring)

  return (
    <div
      ref={cardRef}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
    >
      {/* Card Header */}
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
          {intel.cached && (
            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Cached</span>
          )}
          {intel.status === 'loading' && (
            <Loader2 className="w-4 h-4 animate-spin text-violet-500" />
          )}
          {intel.status === 'idle' && (
            <Sparkles className="w-4 h-4 text-slate-300" />
          )}
          {intel.status === 'done' && (
            <Sparkles className="w-4 h-4 text-violet-500" />
          )}
        </div>
      </div>

      {/* Intel Body */}
      <div className="px-5 pb-4 flex-1 space-y-3">

        {/* Loading skeleton */}
        {intel.status === 'loading' && (
          <div className="space-y-2 animate-pulse">
            <div className="h-3 bg-slate-100 rounded w-3/4" />
            <div className="h-3 bg-slate-100 rounded w-full" />
            <div className="h-3 bg-slate-100 rounded w-2/3" />
          </div>
        )}

        {/* Idle — no fetch yet */}
        {intel.status === 'idle' && (
          <p className="text-[11px] text-slate-400 italic">Researching on scroll…</p>
        )}

        {/* Error */}
        {intel.status === 'error' && (
          <button
            onClick={() => { fetchedRef.current = false; fetchIntel() }}
            className="text-[11px] text-rose-500 flex items-center gap-1 hover:underline"
          >
            <RefreshCw className="w-3 h-3" /> Retry research
          </button>
        )}

        {/* Industry badge + description */}
        {hasContent && (
          <>
            {industry && (
              <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-100 px-2 py-0.5">
                {industry}
              </Badge>
            )}

            {description && (
              <p className="text-[11px] text-slate-600 leading-relaxed line-clamp-3">
                {String(description).slice(0, 200)}
              </p>
            )}

            {/* Hiring signal */}
            {isHiring && (
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  🚀 Actively Hiring
                </span>
              </div>
            )}

            {/* Achievements / Awards */}
            {(achievements.length > 0 || awards.length > 0) && (
              <div className="space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Trophy className="w-3 h-3" /> Achievements
                </p>
                {[...achievements, ...awards].slice(0, 2).map((item: any, i: number) => (
                  <p key={i} className="text-[11px] text-slate-600 line-clamp-1">
                    🏆 {typeof item === 'string' ? item : item.title || item.name || String(item).slice(0, 80)}
                  </p>
                ))}
              </div>
            )}

            {/* Recent news */}
            {recentNews.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Newspaper className="w-3 h-3" /> Recent News
                </p>
                {recentNews.map((news: any, i: number) => (
                  <p key={i} className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                    • {news.title || news.headline || String(news).slice(0, 100)}
                  </p>
                ))}
              </div>
            )}

            {/* Latest LinkedIn post */}
            {postText && (
              <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 space-y-1">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Latest Post
                </p>
                <p className="text-[11px] text-slate-700 line-clamp-3 leading-relaxed italic">
                  "{String(postText).slice(0, 180)}"
                </p>
              </div>
            )}

            {/* Next best action */}
            {nextActions.length > 0 && (
              <div className="bg-violet-50 rounded-xl border border-violet-100 p-3">
                <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Suggested Action
                </p>
                <p className="text-[11px] text-violet-700 leading-relaxed">
                  {typeof nextActions[0] === 'string' ? nextActions[0] : nextActions[0].action || String(nextActions[0]).slice(0, 100)}
                </p>
              </div>
            )}
          </>
        )}

        {/* No intel after load */}
        {intel.status === 'done' && !hasContent && (
          <p className="text-[11px] text-slate-400 italic">No public research data found yet.</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-slate-50 flex items-center justify-between">
        <button
          onClick={() => onViewProfile(member.id)}
          className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
        >
          <Users className="w-3.5 h-3.5" /> View Profile
        </button>
        {intel.status === 'done' && (
          <button
            onClick={() => { fetchedRef.current = false; fetchIntel() }}
            className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        )}
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
              Latest achievements, posts &amp; company signals — auto-researched
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
