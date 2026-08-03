'use client';

/**
 * LinkedIn post approvals — the read-back for the Approval node.
 *
 * The workflow's Approval node gates each scheduled post behind a human: the
 * cron stages a draft, messages the approver two links, and publishes only when
 * one is clicked. That decision was being recorded but never surfaced, so there
 * was no way to see whether a post was waiting on someone, went out, or was
 * skipped. This panel is that view.
 *
 * Renders nothing at all when the campaign has no auto-post schedule, so it is
 * safe to mount unconditionally on the campaign page.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, AlertTriangle, Hourglass,
  RefreshCw, ChevronDown, ChevronUp, ExternalLink,
} from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'expired';

interface ApprovalRow {
  id: string;
  status: ApprovalStatus;
  content: string;
  media_url: string | null;
  channel: string | null;
  sent_to: string | null;
  post_id: string | null;
  error: string | null;
  sent_at: string;
  decided_at: string | null;
}

interface ApprovalsData {
  enabled: boolean;
  require_approval?: boolean;
  approval_status?: string;
  approval_channel?: string | null;
  approval_to?: string | null;
  approval_sent_at?: string | null;
  pending_content?: string | null;
  next_run_at?: string | null;
  last_error?: string | null;
  run_count?: number;
  approvals: ApprovalRow[];
}

/** Drafts nobody answers are swept after 48h — mirrors expireStaleApprovals. */
const APPROVAL_TTL_HOURS = 48;

const STATUS_STYLE: Record<ApprovalStatus, { label: string; icon: React.ElementType; cls: string }> = {
  pending: { label: 'Awaiting approval', icon: Hourglass, cls: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 dark:text-amber-400' },
  approved: { label: 'Approved', icon: CheckCircle2, cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400' },
  rejected: { label: 'Skipped', icon: XCircle, cls: 'text-rose-600 bg-rose-50 dark:bg-rose-500/10 dark:text-rose-400' },
  expired: { label: 'No answer', icon: AlertTriangle, cls: 'text-slate-500 bg-slate-100 dark:bg-slate-500/10 dark:text-slate-400' },
};

function when(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function untilExpiry(sentAt?: string | null): string | null {
  if (!sentAt) return null;
  const sent = new Date(sentAt).getTime();
  if (Number.isNaN(sent)) return null;
  const left = sent + APPROVAL_TTL_HOURS * 3600_000 - Date.now();
  if (left <= 0) return 'expiring now';
  const h = Math.floor(left / 3600_000);
  return h >= 1 ? `${h}h left to decide` : `${Math.max(1, Math.round(left / 60_000))}m left to decide`;
}

export default function LinkedInApprovalsPanel({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<ApprovalsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!campaignId || campaignId === 'new') return;
    setLoading(true);
    try {
      const res = await fetchWithTenant(`/api/campaigns/${campaignId}/linkedin-post/approvals`);
      const json = await res.json();
      if (res.ok && json?.success) { setData(json.data); setFailed(false); }
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  // A draft waiting on a human can be decided from someone's phone at any
  // moment, so poll while pending. Settled campaigns don't need the traffic.
  const isPending = data?.approval_status === 'pending';
  useEffect(() => {
    if (!isPending) return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [isPending, load]);

  // No auto-post node on this campaign (or we couldn't tell) — show nothing
  // rather than an empty card the user has to reason about.
  if (failed || !data?.enabled || !data.require_approval) return null;

  const rows = data.approvals || [];
  const counts = rows.reduce<Record<string, number>>((a, r) => {
    a[r.status] = (a[r.status] || 0) + 1; return a;
  }, {});

  return (
    <div className="absolute top-4 right-4 w-[22rem] max-h-[calc(100%-2rem)] flex flex-col rounded-2xl border border-[#E2E8F0] dark:border-blue-950/40 bg-white dark:bg-[#1a2a43] shadow-xl z-20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 px-4 py-3 border-b border-[#E2E8F0] dark:border-blue-950/40 text-left w-full hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
      >
        <span className="h-8 w-8 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13.5px] font-semibold text-slate-900 dark:text-white">Post approvals</span>
          <span className="block text-[11.5px] text-slate-500 dark:text-slate-400 truncate">
            {isPending ? 'A draft is waiting on you' : `${rows.length} decision${rows.length === 1 ? '' : 's'} so far`}
          </span>
        </span>
        <RefreshCw
          onClick={(e) => { e.stopPropagation(); load(); }}
          className={`h-3.5 w-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex-shrink-0 ${loading ? 'animate-spin' : ''}`}
        />
        {open ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
      </button>

      {open && (
        <div className="overflow-y-auto">
          {/* Live gate — what the cron is actually waiting on right now */}
          {isPending && (
            <div className="m-3 rounded-xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/70 dark:bg-amber-500/10 p-3">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-amber-700 dark:text-amber-400">
                <Hourglass className="h-3.5 w-3.5" /> Awaiting approval
              </div>
              <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-700 dark:text-slate-200 whitespace-pre-wrap line-clamp-6">
                {data.pending_content || '—'}
              </p>
              <div className="mt-2 text-[11px] text-amber-700/80 dark:text-amber-400/80">
                Sent to {data.approval_to || 'the approver'} on {data.approval_channel === 'email' ? 'email' : 'WhatsApp'} · {when(data.approval_sent_at)}
                {untilExpiry(data.approval_sent_at) ? ` · ${untilExpiry(data.approval_sent_at)}` : ''}
              </div>
              <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                Approve or skip from the links in that message — nothing posts until then.
              </div>
            </div>
          )}

          {/* Counts */}
          {rows.length > 0 && (
            <div className="grid grid-cols-3 gap-2 px-3 pb-1">
              {(['approved', 'rejected', 'expired'] as ApprovalStatus[]).map((s) => (
                <div key={s} className="rounded-lg border border-[#E2E8F0] dark:border-blue-950/40 px-2 py-2 text-center">
                  <div className="text-[15px] font-bold text-slate-900 dark:text-white">{counts[s] || 0}</div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400">{STATUS_STYLE[s].label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Next run */}
          {data.next_run_at && (
            <div className="px-4 py-2 flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
              <Clock className="h-3.5 w-3.5" />
              Next draft {new Date(data.next_run_at).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}

          {data.last_error && (
            <div className="mx-3 mb-2 rounded-lg bg-rose-50 dark:bg-rose-500/10 px-3 py-2 text-[11.5px] text-rose-700 dark:text-rose-400">
              Last run failed: {data.last_error}
            </div>
          )}

          {/* History */}
          <div className="px-3 pb-3">
            {rows.length === 0 ? (
              <p className="px-1 py-3 text-[12px] text-slate-500 dark:text-slate-400">
                No drafts have been sent for approval yet. The first one goes out at the next scheduled slot.
              </p>
            ) : (
              <ul className="space-y-2">
                {rows.map((r) => {
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE.expired;
                  const Icon = st.icon;
                  return (
                    <li key={r.id} className="rounded-xl border border-[#E2E8F0] dark:border-blue-950/40 p-2.5">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold ${st.cls}`}>
                          <Icon className="h-3 w-3" /> {st.label}
                        </span>
                        <span className="ml-auto text-[10.5px] text-slate-400">{when(r.decided_at || r.sent_at)}</span>
                      </div>
                      <p className="mt-1.5 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300 line-clamp-3 whitespace-pre-wrap">
                        {r.content}
                      </p>
                      {/* An approval that failed to publish is not a success — say so. */}
                      {r.error && (
                        <div className="mt-1.5 text-[11px] text-rose-600 dark:text-rose-400">Did not post: {r.error}</div>
                      )}
                      {r.post_id && (
                        <a
                          href={`https://www.linkedin.com/feed/update/${encodeURIComponent(r.post_id)}/`}
                          target="_blank" rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          View post <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
