/**
 * AuditLogPanel
 *
 * Unified audit feed for the BNI / community-roi workflow.
 * Shows the latest activity across all sources (chatbot, webhook, sync, admin)
 * with filter chips for action type + actor type.
 *
 * Data source:
 *   GET /api/whatsapp-conversations/audit-log         (list)
 *   GET /api/whatsapp-conversations/audit-log/summary (counts by action)
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, parseISO } from 'date-fns';

interface AuditEntry {
  id: string;
  occurred_at: string;
  actor_type: string;
  actor_name: string | null;
  actor_phone: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: any;
  after: any;
  context: Record<string, any>;
  source_module: string | null;
  description: string | null;
}

const ACTION_COLOR: Record<string, string> = {
  'recommendation.completed':  'bg-emerald-100 text-emerald-700',
  'recommendation.created':    'bg-indigo-100 text-indigo-700',
  'interaction.recorded':      'bg-emerald-100 text-emerald-700',
  'interaction.incremented':   'bg-emerald-50 text-emerald-700',
  'onboarding.step_completed': 'bg-blue-100 text-blue-700',
  'onboarding.step_reset':     'bg-amber-100 text-amber-700',
  'broadcast.sent':            'bg-slate-100 text-slate-700',
  'broadcast.delivered':       'bg-blue-100 text-blue-700',
  'broadcast.read':            'bg-emerald-100 text-emerald-700',
  'broadcast.failed':          'bg-rose-100 text-rose-700',
  'member.phone_updated':      'bg-purple-100 text-purple-700',
  'member.created':            'bg-indigo-100 text-indigo-700',
  'member.deleted':            'bg-rose-100 text-rose-700',
  'directory.synced':          'bg-slate-100 text-slate-700',
};

const ACTOR_COLOR: Record<string, string> = {
  chatbot_self_report: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  admin_ui:            'bg-indigo-50 text-indigo-700 border-indigo-200',
  admin_sql:           'bg-purple-50 text-purple-700 border-purple-200',
  webhook:             'bg-blue-50 text-blue-700 border-blue-200',
  cron:                'bg-slate-50 text-slate-600 border-slate-200',
  system:              'bg-slate-50 text-slate-600 border-slate-200',
  broadcast_send:      'bg-amber-50 text-amber-700 border-amber-200',
};

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [summary, setSummary] = useState<Array<{ action: string; count: number }>>([]);
  const [filter, setFilter] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = (action?: string) => {
    setLoading(true); setError(null);
    const qs = new URLSearchParams();
    if (action) qs.set('action', action);
    qs.set('limit', '100');
    Promise.all([
      fetch(`/api/whatsapp-conversations/audit-log?${qs}`, { cache: 'no-store' }).then(r => r.json()),
      fetch('/api/whatsapp-conversations/audit-log/summary',     { cache: 'no-store' }).then(r => r.json()),
    ])
      .then(([list, sum]) => {
        if (!list?.success) throw new Error('list failed');
        setEntries(list.entries || []);
        if (sum?.success) setSummary(sum.by_action || []);
      })
      .catch(e => setError(e?.message || 'Failed to load'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(filter || undefined); }, [filter]);

  return (
    <Card className="rounded-[1.5rem] border-slate-100 shadow-sm">
      <CardHeader className="p-6 pb-4 border-b border-slate-50">
        <CardTitle className="text-lg font-bold text-slate-900">Activity Audit Log</CardTitle>
        <CardDescription className="text-slate-400 text-xs font-medium mt-0.5">
          Last 7 days · who changed what across the BNI flow
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {/* Filter chips from the summary */}
        {summary.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                filter === '' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({summary.reduce((a, s) => a + s.count, 0)})
            </button>
            {summary.slice(0, 8).map(s => (
              <button
                key={s.action}
                onClick={() => setFilter(s.action === filter ? '' : s.action)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                  filter === s.action ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {prettify(s.action)} <span className="opacity-60">({s.count})</span>
              </button>
            ))}
          </div>
        )}

        {loading && <div className="text-sm text-slate-400">Loading…</div>}
        {error && <div className="text-sm text-rose-500">⚠ {error}</div>}
        {!loading && !error && entries.length === 0 && (
          <div className="text-sm text-slate-400">No activity in this window.</div>
        )}

        <div className="border border-slate-100 rounded-2xl overflow-hidden">
          <div className="max-h-[28rem] overflow-y-auto divide-y divide-slate-50">
            {entries.map(e => (
              <Row key={e.id} entry={e} />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ entry }: { entry: AuditEntry }) {
  const actionCls = ACTION_COLOR[entry.action] || 'bg-slate-100 text-slate-700';
  const actorCls  = ACTOR_COLOR[entry.actor_type]  || 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <div className="p-4 hover:bg-slate-50/60">
      <div className="flex items-center gap-2 mb-1">
        <Badge className={`${actionCls} hover:${actionCls} border-0 text-[10px] font-semibold px-2 py-0`}>
          {prettify(entry.action)}
        </Badge>
        <Badge className={`${actorCls} border text-[10px] font-medium px-2 py-0`} variant="outline">
          {entry.actor_type}
        </Badge>
        {entry.actor_name && (
          <span className="text-xs font-semibold text-slate-700">{entry.actor_name}</span>
        )}
        <span className="text-[11px] text-slate-400 ml-auto whitespace-nowrap">
          {formatDistanceToNow(parseISO(entry.occurred_at), { addSuffix: true })}
        </span>
      </div>
      {entry.description && (
        <p className="text-sm text-slate-600">{entry.description}</p>
      )}
      {entry.context && Object.keys(entry.context).length > 0 && (
        <div className="text-[11px] text-slate-400 mt-1 truncate">
          {Object.entries(entry.context)
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .slice(0, 4)
            .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
            .join(' · ')}
        </div>
      )}
    </div>
  );
}

function prettify(action: string): string {
  return action
    .replace(/[._]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}
