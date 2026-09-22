'use client';

/**
 * Post performance for an auto-post campaign.
 *
 * The analytics page is built around leads and messages; an auto-post
 * campaign has neither, so its four overview cards read zero. This section
 * is what such a campaign is actually doing: posts published, impressions /
 * reactions / comments / reposts (live from LinkedIn), approval outcomes,
 * schedule health, and new 1st-degree connections since the first post that
 * no campaign invitation explains.
 *
 * Renders nothing at all when the backend says 204 (no schedule, no posts),
 * so lead-outreach campaigns are unaffected.
 */

import React from 'react';
import { Eye, ThumbsUp, MessageSquare, Repeat2, FileText, UserPlus, RefreshCw, AlertTriangle, ExternalLink, CalendarClock } from 'lucide-react';
import { useCampaignPostStats } from '@lad/frontend-features/campaigns';

const n = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-US'));
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

function Tile({ icon, label, value, sub, tone = 'slate' }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'slate' | 'blue' | 'green' | 'amber' | 'violet' }) {
  const tones: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300',
    blue: 'bg-blue-50 text-[#0077B5] dark:bg-sky-500/20 dark:text-sky-400',
    green: 'bg-green-100 text-green-600 dark:bg-emerald-500/20 dark:text-emerald-400',
    amber: 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
    violet: 'bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
  };
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-blue-950/40 bg-slate-50/60 dark:bg-[#0a1640] p-4 min-w-0">
      <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-3 ${tones[tone]}`}>{icon}</div>
      <p className="text-xs text-slate-500 dark:text-slate-300 truncate">{label}</p>
      <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums">{value}</p>
      {sub && <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 truncate" title={sub}>{sub}</p>}
    </div>
  );
}

export default function PostPerformanceCard({ campaignId }: { campaignId: string }) {
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
  if (!stats) return null;

  const { totals, schedule, posts, approvals, network } = stats;
  const approvalParts = Object.entries(approvals || {}).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${v} ${k}`);
  const scheduleLine = schedule
    ? [
        schedule.frequency ? `${schedule.frequency}${schedule.post_time ? ` at ${schedule.post_time}` : ''}${schedule.timezone ? ` ${schedule.timezone}` : ''}` : null,
        schedule.run_count != null ? `${schedule.run_count} runs` : null,
        schedule.next_run_at ? `next ${fmtDateTime(schedule.next_run_at)}` : null,
        schedule.require_approval ? `approval via ${schedule.approval_channel || 'WhatsApp'}` : 'no approval step',
      ].filter(Boolean).join(' · ')
    : null;

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

      {(schedule?.last_error || !stats.linkedin_connected) && (
        <div className="mx-5 mb-3 flex items-start gap-2 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{!stats.linkedin_connected ? 'No active LinkedIn account is connected — posts cannot be published until one is.' : `Last run failed: ${schedule?.last_error}`}</span>
        </div>
      )}
      {error && (
        <div className="mx-5 mb-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300">{error}</div>
      )}

      <div className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Tile icon={<FileText className="w-4 h-4" />} label="Posts published" value={n(totals.posts)} sub={totals.posts_deleted ? `${totals.posts_deleted} since deleted on LinkedIn` : approvalParts.length ? approvalParts.join(', ') : undefined} tone="blue" />
        <Tile icon={<Eye className="w-4 h-4" />} label="Impressions" value={n(totals.impressions)} sub={totals.median_impressions != null ? `median ${n(totals.median_impressions)} per post${totals.impressions_unknown ? ` · ${totals.impressions_unknown} unknown` : ''}` : undefined} tone="violet" />
        <Tile icon={<ThumbsUp className="w-4 h-4" />} label="Likes" value={n(totals.reactions)} tone="green" />
        <Tile icon={<MessageSquare className="w-4 h-4" />} label="Comments" value={n(totals.comments)} tone="amber" />
        <Tile icon={<Repeat2 className="w-4 h-4" />} label="Shares" value={n(totals.reposts)} />
        <Tile
          icon={<UserPlus className="w-4 h-4" />}
          label="New 1st connections"
          value={network ? n(network.not_from_invites) : '—'}
          sub={network ? `since ${fmtDate(network.since)}, not from invites · ${n(network.new_connections)} total` : 'available once the first post is live'}
          tone="blue"
        />
      </div>

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
                <th className="px-5 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.post_id} className="border-t border-slate-100 dark:border-slate-800/60 text-slate-700 dark:text-slate-200">
                  <td className="px-5 py-2.5 whitespace-nowrap tabular-nums">{fmtDate(p.published_at)}</td>
                  <td className="px-3 py-2.5 max-w-[34rem]">
                    <span className="block truncate" title={p.content || ''}>{(p.content || '').replace(/\s+/g, ' ')}</span>
                    {p.deleted && <span className="text-xs text-slate-400">Deleted on LinkedIn</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.deleted ? '—' : n(p.impressions)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.deleted ? '—' : n(p.reactions)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.deleted ? '—' : n(p.comments)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{p.deleted ? '—' : n(p.reposts)}</td>
                  <td className="px-5 py-2.5 text-right">
                    {p.share_url && !p.deleted && (
                      <a href={p.share_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-[#0077B5] dark:text-sky-400 hover:underline whitespace-nowrap">
                        View <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100 dark:border-slate-800">
        Impressions, likes, comments and shares are LinkedIn&apos;s live counters. LinkedIn does not attribute connections or profile views to a post; &ldquo;new 1st connections&rdquo; is connections dated after the first post minus those won by campaign invitations.
      </p>
    </div>
  );
}
