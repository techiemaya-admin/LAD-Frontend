/**
 * BroadcastPerformance
 *
 * Chapter-wide template performance dashboard. One row per template name
 * with sent / delivered / read / failed counts, a read-rate progress bar,
 * and the last-sent timestamp.
 *
 * Data source: GET /api/whatsapp-conversations/broadcasts/template-stats
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface TemplateStats {
  template_name: string;
  total: number;
  distinct_recipients: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
  read_rate: number;
  last_sent_at: string | null;
}

export function BroadcastPerformance() {
  const [data, setData] = useState<TemplateStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/whatsapp-conversations/broadcasts/template-stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(json => {
        if (!json?.success) throw new Error('Service returned non-success');
        setData(json.templates || []);
      })
      .catch(e => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Card className="rounded-[1.5rem] border-slate-100 shadow-sm">
      <CardHeader className="p-6 pb-4 border-b border-slate-50">
        <CardTitle className="text-lg font-bold text-slate-900">Broadcast Performance</CardTitle>
        <CardDescription className="text-slate-400 text-xs font-medium mt-0.5">
          Per-template delivery & engagement across all chapter members
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {loading && <div className="text-sm text-slate-400">Loading…</div>}
        {error && <div className="text-sm text-rose-500">⚠ {error}</div>}
        {!loading && !error && data.length === 0 && (
          <div className="text-sm text-slate-400">No template broadcasts have been sent yet.</div>
        )}

        {data.map(t => (
          <TemplateRow key={t.template_name} stats={t} />
        ))}
      </CardContent>
    </Card>
  );
}

function TemplateRow({ stats }: { stats: TemplateStats }) {
  const readPct = stats.read_rate;
  const deliveredPct = stats.total > 0 ? Math.round(((stats.delivered + stats.read) / stats.total) * 100) : 0;

  return (
    <div className="border border-slate-100 rounded-2xl p-4 hover:bg-slate-50/40">
      <div className="flex items-center justify-between mb-3">
        <div className="min-w-0">
          <h4 className="text-sm font-bold text-slate-900 truncate">{stats.template_name}</h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {stats.distinct_recipients} recipient{stats.distinct_recipients === 1 ? '' : 's'}
            {stats.last_sent_at && (
              <> · last sent {formatDistanceToNow(parseISO(stats.last_sent_at), { addSuffix: true })}</>
            )}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-emerald-600 leading-none">{readPct}%</div>
          <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-1">read rate</div>
        </div>
      </div>

      {/* Stacked status bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 mb-3">
        {stats.read > 0 && (
          <div className="bg-emerald-500" style={{ width: `${(stats.read / stats.total) * 100}%` }} title={`${stats.read} read`} />
        )}
        {stats.delivered > 0 && (
          <div className="bg-blue-500" style={{ width: `${(stats.delivered / stats.total) * 100}%` }} title={`${stats.delivered} delivered`} />
        )}
        {stats.sent > 0 && (
          <div className="bg-slate-400" style={{ width: `${(stats.sent / stats.total) * 100}%` }} title={`${stats.sent} sent (no delivery confirmation yet)`} />
        )}
        {stats.failed > 0 && (
          <div className="bg-rose-500" style={{ width: `${(stats.failed / stats.total) * 100}%` }} title={`${stats.failed} failed`} />
        )}
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <StatTile label="Total"     value={stats.total}     cls="text-slate-700" />
        <StatTile label="Read"      value={stats.read}      cls="text-emerald-700" />
        <StatTile label="Delivered" value={stats.delivered} cls="text-blue-700" />
        <StatTile label="Failed"    value={stats.failed}    cls="text-rose-700" />
      </div>
    </div>
  );
}

function StatTile({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-400">{label}</span>
      <span className={`font-bold ${cls}`}>{value}</span>
    </div>
  );
}
