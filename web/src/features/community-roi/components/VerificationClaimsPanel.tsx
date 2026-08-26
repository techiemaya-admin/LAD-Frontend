/**
 * VerificationClaimsPanel
 *
 * Admin review queue for member "1-2-1 verification" claims.
 *
 * When a member replies to the 1-2-1 verification WhatsApp message asserting they
 * have already met a recommended partner (missing from BNI Connect), WABA captures
 * it as a PENDING claim rather than auto-applying it. An admin approves or rejects
 * each claim here; approving folds the 1-2-1 into the member's metrics and re-applies
 * it as a durable overlay after every import.
 *
 * Data source (proxied to LAD_backend/features/community-roi):
 *   GET  /api/community-roi/1to1-claims?status=pending   (list + counts)
 *   POST /api/community-roi/1to1-claims/:id/approve
 *   POST /api/community-roi/1to1-claims/:id/reject
 *
 * Always rendered (like an inbox): shows the status tabs and a "no claims" empty
 * state even at zero, so admins can discover the queue and see it fill up as
 * members reply to the verification message.
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ShieldCheck, Check, X, ArrowRight, RefreshCw } from 'lucide-react';

interface Claim {
  id: string;
  claimant_name: string;
  claimed_name: string;
  status: 'pending' | 'approved' | 'rejected';
  source: string | null;
  raw_reply: string | null;
  conversation_id: string | null;
  wamid: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

type StatusFilter = 'pending' | 'approved' | 'rejected';

const STATUS_TABS: Array<{ key: StatusFilter; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
};

export function VerificationClaimsPanel() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<StatusFilter>('pending');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acting, setActing] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState<string | null>(null);

  const fetchData = (status: StatusFilter) => {
    setLoading(true);
    setError(null);
    fetch(`/api/community-roi/1to1-claims?status=${status}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((res) => {
        if (!res?.success) throw new Error(res?.error || 'Failed to load claims');
        setClaims(res.data || []);
        setCounts(res.counts || {});
      })
      .catch((e) => setError(e?.message || 'Failed to load claims'))
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData(filter);
  }, [filter]);

  const review = async (claim: Claim, action: 'approve' | 'reject') => {
    setActing((s) => ({ ...s, [claim.id]: true }));
    setError(null);
    setNote(null);
    try {
      const res = await fetch(`/api/community-roi/1to1-claims/${claim.id}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then((r) => r.json());
      if (!res?.success) throw new Error(res?.error || `Failed to ${action}`);

      // Optimistically drop the row from the current list + adjust counts.
      setClaims((list) => list.filter((c) => c.id !== claim.id));
      setCounts((c) => ({
        ...c,
        [filter]: Math.max(0, (c[filter] || 1) - 1),
        [action === 'approve' ? 'approved' : 'rejected']:
          (c[action === 'approve' ? 'approved' : 'rejected'] || 0) + 1,
      }));

      if (action === 'approve') {
        const applied = res.overlayApplied ?? 0;
        setNote(
          `Approved - ${claim.claimant_name} ↔ ${claim.claimed_name} folded into metrics` +
            (applied ? ` (${applied} claim${applied === 1 ? '' : 's'} applied)` : ''),
        );
      } else {
        setNote(`Rejected - ${claim.claimant_name} ↔ ${claim.claimed_name}`);
      }
    } catch (e: any) {
      setError(e?.message || `Failed to ${action} claim`);
    } finally {
      setActing((s) => ({ ...s, [claim.id]: false }));
    }
  };

  return (
    <Card className="rounded-[1.5rem] border-slate-100 shadow-sm">
      <CardHeader className="p-6 pb-4 border-b border-slate-50">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-500" />
          <CardTitle className="text-lg font-bold text-slate-900">1-2-1 Verification Claims</CardTitle>
          {(counts.pending || 0) > 0 && (
            <Badge className="bg-amber-100 text-amber-700 border-0 text-[11px] font-semibold ml-1">
              {counts.pending} to review
            </Badge>
          )}
          <button
            onClick={() => fetchData(filter)}
            className="ml-auto text-slate-400 hover:text-slate-700 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <CardDescription className="text-slate-400 text-xs font-medium mt-1">
          Members replied that they&apos;ve already met a recommended partner. Approve to fold the
          1-2-1 into their metrics (re-applied after every import); reject to leave data unchanged.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Status tabs with counts */}
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                filter === t.key
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t.label} <span className="opacity-60">({counts[t.key] || 0})</span>
            </button>
          ))}
        </div>

        {note && (
          <div className="text-sm text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            {note}
          </div>
        )}
        {error && <div className="text-sm text-rose-500">⚠ {error}</div>}
        {loading && <div className="text-sm text-slate-400">Loading…</div>}
        {!loading && !error && claims.length === 0 && (
          <div className="text-sm text-slate-400">No {filter} claims.</div>
        )}

        {claims.length > 0 && (
          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-50">
              {claims.map((c) => (
                <ClaimRow
                  key={c.id}
                  claim={c}
                  busy={!!acting[c.id]}
                  onApprove={() => review(c, 'approve')}
                  onReject={() => review(c, 'reject')}
                />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ClaimRow({
  claim,
  busy,
  onApprove,
  onReject,
}: {
  claim: Claim;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isPending = claim.status === 'pending';
  return (
    <div className="p-4 hover:bg-slate-50/60">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-semibold text-slate-800">{claim.claimant_name}</span>
        <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-sm font-semibold text-slate-800">{claim.claimed_name}</span>
        <Badge
          className={`${STATUS_BADGE[claim.status] || 'bg-slate-100 text-slate-700'} border-0 text-[10px] font-semibold px-2 py-0`}
        >
          {claim.status}
        </Badge>
        <span className="text-[11px] text-slate-400 ml-auto whitespace-nowrap">
          {formatDistanceToNow(parseISO(claim.created_at), { addSuffix: true })}
        </span>
      </div>

      {claim.raw_reply && (
        <p className="text-xs text-slate-500 mt-1 italic">
          &ldquo;{claim.raw_reply.length > 240 ? `${claim.raw_reply.slice(0, 240)}…` : claim.raw_reply}&rdquo;
        </p>
      )}

      {!isPending && claim.reviewed_by && (
        <div className="text-[11px] text-slate-400 mt-1">
          {claim.status} by {claim.reviewed_by}
          {claim.reviewed_at && ` · ${formatDistanceToNow(parseISO(claim.reviewed_at), { addSuffix: true })}`}
        </div>
      )}

      {isPending && (
        <div className="flex items-center gap-2 mt-2">
          <Button
            size="sm"
            onClick={onApprove}
            disabled={busy}
            className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Check className="w-4 h-4" /> Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onReject}
            disabled={busy}
            className="h-8 border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
          >
            <X className="w-4 h-4" /> Reject
          </Button>
          {busy && <span className="text-xs text-slate-400">Saving…</span>}
        </div>
      )}
    </div>
  );
}
