'use client';

/**
 * Post performance for an auto-post campaign.
 *
 * The analytics page is built around leads and messages; an auto-post
 * campaign has neither, so its overview cards read zero. This section is
 * what such a campaign is actually doing, derived from LinkedIn's live
 * per-post counters:
 *
 *   reach       posts published, impressions (total / per post / best post),
 *               audience (followers), impressions by week
 *   engagement  likes, comments, shares, engagements, engagement rate
 *   momentum    last 7 days vs the 7 before, best publishing day
 *   pipeline    schedule health, approval response rate, runs → published
 *   conversion  new 1st-degree connections since the first post that no
 *               campaign invitation explains
 *
 * Every tile is shown only when it has a non-zero value — a row of zeros is
 * hidden, not drawn. Renders nothing at all when the backend says 204 (no
 * schedule, no posts) unless the page hands over an `emptyFallback`.
 */

import React from 'react';
import {
  Eye, ThumbsUp, MessageSquare, Repeat2, FileText, UserPlus, RefreshCw, AlertTriangle, ExternalLink,
  CalendarClock, Users, Sparkles, Percent, TrendingUp, TrendingDown, Award, CheckCircle2, CalendarDays,
} from 'lucide-react';
import { useCampaignPostStats } from '@lad/frontend-features/campaigns';
import type { CampaignPostStats, CampaignPostStatsPost } from '@lad/frontend-features/campaigns';

const n = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-US'));
const pct = (num: number, den: number) => (den > 0 ? `${((num / den) * 100).toFixed(num / den >= 0.1 ? 0 : 1)}%` : '—');
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const DAY_MS = 86400000;
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Everything the card can say, computed once from the payload. */
function deriveMetrics(stats: CampaignPostStats) {
  const live = stats.posts.filter((p) => p.stats_available && !p.deleted);
  const withImp = live.filter((p) => p.impressions != null);
  const sum = (k: keyof CampaignPostStatsPost) => live.reduce((acc, p) => acc + ((p[k] as number | null) || 0), 0);
  const impressions = sum('impressions'), likes = sum('reactions'), comments = sum('comments'), shares = sum('reposts');
  const engagements = likes + comments + shares;
  const best = withImp.reduce<CampaignPostStatsPost | null>((b, p) => (b == null || (p.impressions || 0) > (b.impressions || 0) ? p : b), null);

  // Momentum: posts published in the last 7 days vs the 7 before that. Counters
  // are cumulative per post, not a time series, so this compares cohorts of
  // posts rather than daily views — stated as such in the footnote.
  const now = Date.now();
  const cohort = (from: number, to: number) => withImp.filter((p) => { const t = new Date(p.published_at).getTime(); return t >= from && t < to; });
  const last7 = cohort(now - 7 * DAY_MS, now), prev7 = cohort(now - 14 * DAY_MS, now - 7 * DAY_MS);
  const imp = (list: CampaignPostStatsPost[]) => list.reduce((a, p) => a + (p.impressions || 0), 0);
  const trend = prev7.length && last7.length ? (imp(last7) - imp(prev7)) / Math.max(imp(prev7), 1) : null;

  // Weekly impressions (Monday-start weeks) for the bar strip.
  const weekOf = (iso: string) => { const d = new Date(iso); const day = (d.getDay() + 6) % 7; const m = new Date(d); m.setHours(0, 0, 0, 0); m.setDate(m.getDate() - day); return m.getTime(); };
  const weeks = new Map<number, { impressions: number; posts: number }>();
  for (const p of withImp) { const w = weekOf(p.published_at); const cur = weeks.get(w) || { impressions: 0, posts: 0 }; cur.impressions += p.impressions || 0; cur.posts += 1; weeks.set(w, cur); }
  const weekly = [...weeks.entries()].sort((a, b) => a[0] - b[0]).map(([start, v]) => ({ start, ...v }));

  // Best publishing day: needs at least two posts on that weekday to mean anything.
  const byDay = new Map<number, number[]>();
  for (const p of withImp) { const d = new Date(p.published_at).getDay(); byDay.set(d, [...(byDay.get(d) || []), p.impressions || 0]); }
  let bestDay: { day: string; avg: number; posts: number } | null = null;
  for (const [d, list] of byDay) { if (list.length < 2) continue; const avg = list.reduce((a, b) => a + b, 0) / list.length; if (!bestDay || avg > bestDay.avg) bestDay = { day: WEEKDAYS[d], avg: Math.round(avg), posts: list.length }; }

  const ap = stats.approvals || {};
  const answered = (ap.approved || 0) + (ap.rejected || 0) + (ap.revised || 0);
  const asked = answered + (ap.expired || 0);

  return {
    posts: stats.totals.posts, deleted: stats.totals.posts_deleted, livePosts: live.length,
    impressions, likes, comments, shares, engagements,
    avgImpressions: withImp.length ? Math.round(impressions / withImp.length) : null,
    medianImpressions: stats.totals.median_impressions,
    engagementRate: impressions > 0 ? engagements / impressions : null,
    best, last7: { posts: last7.length, impressions: imp(last7) }, prev7: { posts: prev7.length, impressions: imp(prev7) }, trend,
    weekly, bestDay,
    approvals: { asked, answered, approved: ap.approved || 0, expired: ap.expired || 0, rejected: ap.rejected || 0, revised: ap.revised || 0 },
    followers: stats.profile?.followers ?? null,
    connections: stats.profile?.connections ?? null,
    network: stats.network,
    unknownImpressions: stats.totals.impressions_unknown,
  };
}

type Tone = 'slate' | 'blue' | 'green' | 'amber' | 'violet' | 'rose';
const TONES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
  blue: 'bg-blue-50 text-[#0077B5] dark:bg-sky-500/20 dark:text-sky-400',
  green: 'bg-green-100 text-green-600 dark:bg-emerald-500/20 dark:text-emerald-400',
  amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
  violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
  rose: 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400',
};

function Tile({ icon, label, value, sub, tone = 'slate' }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: Tone }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-blue-950/40 bg-slate-50/60 dark:bg-[#0a1640] p-4 min-w-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-3 ${TONES[tone]}`}>{icon}</div>
      <p className="text-xs text-slate-500 dark:text-slate-300 truncate" title={label}>{label}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={sub}>{sub}</p>}
    </div>
  );
}

function WeeklyBars({ weekly }: { weekly: Array<{ start: number; impressions: number; posts: number }> }) {
  const max = Math.max(...weekly.map((w) => w.impressions), 1);
  return (
    <div className="px-5 pb-4">
      <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Impressions by week posted</p>
      <div className="flex items-end gap-2 h-24">
        {weekly.map((w) => (
          <div key={w.start} className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1" title={`${n(w.impressions)} impressions · ${w.posts} post${w.posts === 1 ? '' : 's'}`}>
            <span className="text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">{n(w.impressions)}</span>
            <div className="w-full rounded-t bg-[#0077B5]/70 dark:bg-sky-500/60" style={{ height: `${Math.max((w.impressions / max) * 64, 3)}px` }} />
            <span className="text-[10px] text-slate-400 whitespace-nowrap">{fmtDate(new Date(w.start).toISOString())}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PostPerformanceCard({ campaignId, emptyFallback = null }: { campaignId: string; emptyFallback?: React.ReactNode }) {
  const { data: stats, isLoading, error: queryError, refresh } = useCampaignPostStats(campaignId);
  const [refreshing, setRefreshing] = React.useState(false);
  const [refreshError, setRefreshError] = React.useState<string | null>(null);
  const error = refreshError || (queryError ? (queryError.message || 'Could not load post stats') : null);

  const onRefresh = async () => {
    setRefreshing(true); setRefreshError(null);
    try { await refresh(); } catch (e) { setRefreshError((e as Error)?.message || 'Could not refresh'); } finally { setRefreshing(false); }
  };

  // Loading: a light placeholder so the section does not pop in from nowhere
  // on campaigns that have it — the first read can take several seconds while
  // LinkedIn is queried per post.
  if (isLoading) {
    return (
      <div className="mb-8 bg-white dark:bg-[#071131] rounded-2xl border border-slate-200 dark:border-blue-950/40 shadow-sm p-5">
        <div className="h-5 w-48 bg-slate-100 dark:bg-slate-700/40 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 bg-slate-50 dark:bg-slate-700/30 rounded-2xl animate-pulse" />)}
        </div>
      </div>
    );
  }
  // null = not an auto-post campaign; undefined after an error = nothing to show either
  if (!stats) return <>{emptyFallback}</>;

  const m = deriveMetrics(stats);
  const { schedule, posts } = stats;
  const scheduleLine = schedule
    ? [
        schedule.frequency ? `${schedule.frequency}${schedule.post_time ? ` at ${schedule.post_time}` : ''}${schedule.timezone ? ` ${schedule.timezone}` : ''}` : null,
        schedule.run_count != null ? `${schedule.run_count} runs` : null,
        schedule.next_run_at ? `next ${fmtDateTime(schedule.next_run_at)}` : null,
        schedule.require_approval ? `approval via ${schedule.approval_channel || 'WhatsApp'}` : 'no approval step',
      ].filter(Boolean).join(' · ')
    : null;
  const warning = !stats.linkedin_connected
    ? 'No active LinkedIn account is connected — posts cannot be published until one is.'
    : schedule?.last_error ? `Last run failed: ${schedule.last_error}` : null;

  // Nothing published and nothing to warn about: the schedule exists but has
  // never fired. A card of zeros would say less than one line.
  if (!m.posts && !warning) {
    return (
      <div className="mb-8 bg-white dark:bg-[#071131] rounded-2xl border border-slate-200 dark:border-blue-950/40 shadow-sm px-5 py-4 flex items-center gap-3">
        <CalendarClock className="w-5 h-5 text-slate-400 flex-shrink-0" />
        <div>
          <p className="font-bold text-[#1E293B] dark:text-white">LinkedIn posting is scheduled — nothing published yet</p>
          {scheduleLine && <p className="text-xs text-slate-500 dark:text-slate-400">{scheduleLine}</p>}
        </div>
      </div>
    );
  }

  // Tiles: shown only when the value is non-zero. Posts and impressions
  // anchor the row whenever anything was published.
  const tiles = ([
    { key: 'posts', show: m.posts > 0, el: <Tile icon={<FileText className="w-4 h-4" />} label="Posts published" value={n(m.posts)} sub={m.deleted ? `${m.deleted} since deleted on LinkedIn` : m.livePosts !== m.posts ? `${m.livePosts} with live stats` : undefined} tone="blue" /> },
    { key: 'imp', show: m.impressions > 0, el: <Tile icon={<Eye className="w-4 h-4" />} label="Impressions" value={n(m.impressions)} sub={m.avgImpressions != null ? `avg ${n(m.avgImpressions)} · median ${n(m.medianImpressions)} per post${m.unknownImpressions ? ` · ${m.unknownImpressions} unknown` : ''}` : undefined} tone="violet" /> },
    { key: 'followers', show: (m.followers ?? 0) > 0, el: <Tile icon={<Users className="w-4 h-4" />} label="Audience" value={n(m.followers)} sub={`followers${m.connections != null ? ` · ${n(m.connections)} connections` : ''}`} tone="slate" /> },
    { key: 'likes', show: m.likes > 0, el: <Tile icon={<ThumbsUp className="w-4 h-4" />} label="Likes" value={n(m.likes)} tone="green" /> },
    { key: 'comments', show: m.comments > 0, el: <Tile icon={<MessageSquare className="w-4 h-4" />} label="Comments" value={n(m.comments)} tone="amber" /> },
    { key: 'shares', show: m.shares > 0, el: <Tile icon={<Repeat2 className="w-4 h-4" />} label="Shares" value={n(m.shares)} tone="slate" /> },
    { key: 'engRate', show: m.engagements > 0 && m.impressions > 0, el: <Tile icon={<Percent className="w-4 h-4" />} label="Engagement rate" value={m.engagementRate != null ? `${(m.engagementRate * 100).toFixed(2)}%` : '—'} sub={`${n(m.engagements)} engagements / ${n(m.impressions)} impressions`} tone="green" /> },
    { key: 'best', show: !!m.best && (m.best.impressions || 0) > 0, el: <Tile icon={<Award className="w-4 h-4" />} label="Best post" value={n(m.best?.impressions)} sub={m.best ? `${fmtDate(m.best.published_at)} · ${(m.best.content || '').replace(/\s+/g, ' ').slice(0, 60)}` : undefined} tone="amber" /> },
    { key: 'last7', show: m.last7.posts > 0, el: <Tile icon={m.trend != null && m.trend < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />} label="Last 7 days" value={n(m.last7.impressions)} sub={`${m.last7.posts} post${m.last7.posts === 1 ? '' : 's'}${m.trend != null ? ` · ${m.trend >= 0 ? '+' : ''}${Math.round(m.trend * 100)}% vs prior 7 days (${n(m.prev7.impressions)})` : ''}`} tone={m.trend != null && m.trend < 0 ? 'rose' : 'green'} /> },
    { key: 'bestDay', show: !!m.bestDay, el: <Tile icon={<CalendarDays className="w-4 h-4" />} label="Best day to post" value={m.bestDay?.day || '—'} sub={m.bestDay ? `avg ${n(m.bestDay.avg)} impressions over ${m.bestDay.posts} posts` : undefined} tone="violet" /> },
    { key: 'approval', show: m.approvals.asked > 0, el: <Tile icon={<CheckCircle2 className="w-4 h-4" />} label="Approval response" value={pct(m.approvals.answered, m.approvals.asked)} sub={`${m.approvals.approved} approved${m.approvals.revised ? `, ${m.approvals.revised} revised` : ''}${m.approvals.rejected ? `, ${m.approvals.rejected} rejected` : ''}${m.approvals.expired ? `, ${m.approvals.expired} expired unanswered` : ''}`} tone={m.approvals.expired > m.approvals.answered ? 'rose' : 'slate'} /> },
    { key: 'runs', show: (schedule?.run_count ?? 0) > 0 && m.posts > 0, el: <Tile icon={<Sparkles className="w-4 h-4" />} label="Runs → published" value={pct(m.posts, schedule?.run_count || 0)} sub={`${n(m.posts)} of ${n(schedule?.run_count)} scheduled runs went live`} tone="slate" /> },
    { key: 'network', show: !!m.network && m.network.not_from_invites > 0, el: <Tile icon={<UserPlus className="w-4 h-4" />} label="New 1st connections" value={n(m.network?.not_from_invites)} sub={m.network ? `since ${fmtDate(m.network.since)}, not from invites · ${n(m.network.new_connections)} total` : undefined} tone="blue" /> },
  ] as Array<{ key: string; show: boolean; el: React.ReactNode }>).filter((t) => t.show);

  return (
    <div className="mb-8 bg-white dark:bg-[#071131] rounded-2xl border border-slate-200 dark:border-blue-950/40 shadow-sm">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 gap-3 flex-wrap">
        <div>
          <h5 className="text-lg font-bold text-[#1E293B] dark:text-white">LinkedIn Post Performance</h5>
          {scheduleLine && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5"><CalendarClock className="w-3.5 h-3.5" />{scheduleLine}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Live from LinkedIn · {fmtDateTime(stats.fetched_at)}</span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 dark:border-blue-950/40 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {warning && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{warning}</span>
        </div>
      )}
      {error && (
        <div className="mx-5 mb-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      {tiles.length > 0 && (
        <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
          {tiles.map((t) => <React.Fragment key={t.key}>{t.el}</React.Fragment>)}
        </div>
      )}

      {m.weekly.length > 1 && <WeeklyBars weekly={m.weekly} />}

      {posts.length > 0 && (
        <div className="border-t border-slate-100 dark:border-slate-800 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                <th className="text-left font-medium px-5 py-2.5 whitespace-nowrap">Published</th>
                <th className="text-left font-medium px-3 py-2.5">Post</th>
                <th className="text-right font-medium px-3 py-2.5">Impressions</th>
                <th className="text-right font-medium px-3 py-2.5">Likes</th>
                <th className="text-right font-medium px-3 py-2.5">Comments</th>
                <th className="text-right font-medium px-3 py-2.5">Shares</th>
                <th className="text-right font-medium px-3 py-2.5 whitespace-nowrap">Eng. rate</th>
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const eng = (p.reactions || 0) + (p.comments || 0) + (p.reposts || 0);
                return (
                  <tr key={p.post_id} className="border-t border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-200">
                    <td className="px-5 py-2.5 whitespace-nowrap tabular-nums">{fmtDate(p.published_at)}</td>
                    <td className="px-3 py-2.5 max-w-[30rem]">
                      <span className="block truncate" title={p.content || ''}>{(p.content || '').replace(/\s+/g, ' ')}</span>
                      {p.deleted && <span className="text-xs text-slate-400">Deleted on LinkedIn</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.deleted ? '—' : n(p.impressions)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.deleted ? '—' : n(p.reactions)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.deleted ? '—' : n(p.comments)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.deleted ? '—' : n(p.reposts)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{p.deleted || !p.impressions ? '—' : `${((eng / p.impressions) * 100).toFixed(1)}%`}</td>
                    <td className="px-5 py-2.5 text-right">
                      {p.share_url && !p.deleted && (
                        <a href={p.share_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#0077B5] dark:text-sky-400 hover:underline whitespace-nowrap">
                          View <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
        Impressions, likes, comments and shares are LinkedIn&apos;s live counters; &ldquo;last 7 days&rdquo; compares posts published in each window, not daily views. LinkedIn does not attribute connections or profile views to a post; &ldquo;new 1st connections&rdquo; is connections dated after the first post minus those won by campaign invitations.
      </p>
    </div>
  );
}
