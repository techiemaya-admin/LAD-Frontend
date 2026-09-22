'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Loader2, Sparkles, Check, X, Linkedin, Mail, MessageCircle, AlertCircle,
  CheckCircle2, Ban, ChevronDown, ChevronRight, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

type SortKey = 'recent' | 'contact' | 'channel' | 'subject';
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'recent', label: 'Newest first' },
  { value: 'contact', label: 'Contact A-Z' },
  { value: 'subject', label: 'Task A-Z' },
  { value: 'channel', label: 'Channel' },
];

const ZOHO_API = '/api/social-integration/zoho';

interface Automation {
  id: string;
  task_source_id: string;
  subject?: string | null;
  contact_name?: string | null;
  channel?: string | null;
  action?: string | null;
  target?: { linkedin_url?: string; phone?: string; email?: string; name?: string } | null;
  message?: string | null;
  confidence?: number | null;
  reason?: string | null;
  status: string;
  error?: string | null;
  executed_at?: string | null;
}

const channelIcon = (ch?: string | null) => {
  if (ch === 'linkedin') return <Linkedin className="h-4 w-4 text-blue-700" />;
  if (ch === 'whatsapp') return <MessageCircle className="h-4 w-4 text-green-600" />;
  if (ch === 'email') return <Mail className="h-4 w-4 text-slate-600" />;
  return <Sparkles className="h-4 w-4 text-muted-foreground" />;
};

const targetLabel = (a: Automation) =>
  a.target?.email || a.target?.phone || a.target?.linkedin_url || a.contact_name || '';

export const ZohoAutomationsPanel: React.FC = () => {
  const [items, setItems] = useState<Automation[]>([]);
  const [enabled, setEnabled] = useState(true);
  const [connected, setConnected] = useState(true);
  /** The server could not determine the connection state — not the same as "off". */
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [queryScanning, setQueryScanning] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('recent');

  const load = useCallback(async () => {
    try {
      const [automationsRes, statusRes] = await Promise.all([
        fetchWithTenant(`${ZOHO_API}/automations`),
        fetchWithTenant(`${ZOHO_API}/status`),
      ]);
      const data = await automationsRes.json();
      if (automationsRes.ok && data?.success) {
        setItems(data.data || []);
        setEnabled(data.automation_enabled !== false);
      }
      const statusData = await statusRes.json();
      if (statusRes.ok && statusData?.success) {
        setConnected(!!statusData.data?.connected);
        setStatusUnavailable(!!statusData.data?.status_unavailable);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Why the scan controls are disabled. "Connect Zoho CRM first" is wrong when
  // we simply could not read the status — the tenant may well be connected.
  const blockedReason = statusUnavailable
    ? "Couldn't check your Zoho connection — try again shortly"
    : 'Connect Zoho CRM first';

  const handleScan = async () => {
    setScanning(true); setBanner(null);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/automations/scan`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data?.success) {
        const s = data.data || {};
        const li = s.resolved_linkedin ? ` (${s.resolved_linkedin} LinkedIn profiles resolved)` : '';
        setBanner({ kind: 'ok', text: `Scanned ${s.scanned || 0} tasks - ${s.proposed || 0} proposed, ${s.skipped || 0} skipped${li}.` });
        load();
      } else {
        setBanner({ kind: 'err', text: data?.error || 'Scan failed' });
      }
    } catch { setBanner({ kind: 'err', text: 'Scan failed' }); }
    finally { setScanning(false); }
  };

  const handleQueryScan = async () => {
    const query = search.trim();
    if (!query) return;
    setQueryScanning(true); setBanner(null);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/automations/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        const s = data.data || {};
        const li = s.resolved_linkedin ? `, ${s.resolved_linkedin} LinkedIn resolved` : '';
        setBanner({ kind: 'ok', text: `Searched Zoho for "${query}": ${s.scanned || 0} matching tasks, ${s.proposed || 0} actionable, ${s.skipped || 0} skipped${li} (see History).` });
        setShowHistory(true);
        load();
      } else {
        setBanner({ kind: 'err', text: data?.error || 'Search scan failed' });
      }
    } catch { setBanner({ kind: 'err', text: 'Search scan failed' }); }
    finally { setQueryScanning(false); }
  };

  const saveDraftIfChanged = async (a: Automation) => {
    const draft = drafts[a.id];
    if (draft != null && draft !== (a.message || '')) {
      await fetchWithTenant(`${ZOHO_API}/automations/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft }),
      });
    }
  };

  const handleApprove = async (a: Automation) => {
    setBusyId(a.id); setBanner(null);
    try {
      await saveDraftIfChanged(a);
      const res = await fetchWithTenant(`${ZOHO_API}/automations/${a.id}/approve`, { method: 'POST' });
      const data = await res.json();
      const st = data?.data?.status;
      if (res.ok && st === 'completed') {
        setBanner({ kind: 'ok', text: `Sent to ${a.contact_name || 'contact'} via ${a.channel} and marked the Zoho task complete.` });
      } else if (data?.data?.escalated) {
        setBanner({ kind: 'err', text: `Held by the safety supervisor: ${data?.data?.reason || 'needs review'}.` });
      } else {
        setBanner({ kind: 'err', text: data?.error || data?.data?.error || 'Could not run this automation.' });
      }
      load();
    } catch { setBanner({ kind: 'err', text: 'Could not run this automation.' }); }
    finally { setBusyId(null); }
  };

  const handleReject = async (a: Automation) => {
    setBusyId(a.id);
    try {
      await fetchWithTenant(`${ZOHO_API}/automations/${a.id}/reject`, { method: 'POST' });
      load();
    } catch { /* ignore */ } finally { setBusyId(null); }
  };

  const proposals = items.filter((a) => a.status === 'proposed' || a.status === 'failed');
  const history = items.filter((a) => ['completed', 'rejected', 'skipped'].includes(a.status));

  const matchesSearch = (a: Automation, q: string) =>
    [a.subject, a.contact_name, a.message, a.channel, a.action, a.reason, targetLabel(a)]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));

  const visibleProposals = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? proposals.filter((a) => matchesSearch(a, q)) : proposals;
    const sorted = [...list];
    if (sortBy === 'contact') sorted.sort((a, b) => (a.contact_name || '').localeCompare(b.contact_name || ''));
    else if (sortBy === 'subject') sorted.sort((a, b) => (a.subject || '').localeCompare(b.subject || ''));
    else if (sortBy === 'channel') sorted.sort((a, b) => (a.channel || '').localeCompare(b.channel || ''));
    // 'recent' keeps backend order (proposed-first, created_at desc)
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proposals, search, sortBy]);

  const visibleHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? history.filter((a) => matchesSearch(a, q)) : history;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, search]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-5 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <div>
            <div className="text-sm font-semibold text-[#172560] dark:text-white">Task Automations</div>
            <p className="text-xs text-slate-500 dark:text-[#7a8ba3]">
              Turn open Zoho tasks into LinkedIn / WhatsApp / Email actions. You approve each before it sends.
            </p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={scanning || !connected}
          title={connected ? undefined : blockedReason}
          className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-primary/95 hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {scanning ? 'Scanning…' : 'Scan open tasks'}
        </button>
      </div>

      {!loading && !connected && statusUnavailable && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          Couldn&apos;t check your Zoho connection, so scanning is paused. This isn&apos;t
          &quot;not connected&quot; — please try again shortly.
        </div>
      )}
      {!loading && !connected && !statusUnavailable && (
        <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 p-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Zoho CRM isn&apos;t connected. Connect it in Settings → Integrations to scan and sync tasks.
            {/* Proposals are rows in this tenant's DB, so they survive a
                disconnect. Showing them under a bare "isn't connected" banner
                made them look like live, sendable work — and, because they came
                from whichever Zoho account was connected at the time, like data
                from somewhere else entirely. Name where they came from. */}
            {proposals.length > 0 && (
              <>
                {' '}The {proposals.length} draft{proposals.length === 1 ? '' : 's'} below {proposals.length === 1 ? 'was' : 'were'} imported
                by an earlier scan, from the Zoho account that was connected then. {proposals.length === 1 ? 'It' : 'They'} can&apos;t
                be sent while Zoho is disconnected — reject {proposals.length === 1 ? 'it' : 'them'} if they&apos;re no longer wanted.
              </>
            )}
          </span>
        </div>
      )}
      {!enabled && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 p-3 text-sm text-amber-800 dark:text-amber-200">
          <p className="leading-relaxed">
            <AlertCircle className="inline-block h-4 w-4 mr-1.5 align-text-bottom flex-shrink-0" />
            Automation execution is currently disabled. Proposals will still appear, but approving is blocked until an admin sets <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 font-semibold">ZOHO_TASK_AUTOMATION_ENABLED=true</code>.
          </p>
        </div>
      )}
      {banner && (
        <div className={`flex items-start gap-2 rounded-lg p-3 text-sm border ${
          banner.kind === 'ok' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/40 dark:border-green-800 dark:text-green-200' : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950/40 dark:border-red-800 dark:text-red-200'
        }`}>
          {banner.kind === 'ok' ? <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
          {banner.text}
        </div>
      )}

      {!loading && (
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex items-center w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                className="w-full pl-9 pr-3 h-9 rounded-lg text-sm border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-slate-800/50 text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Search a task or contact (e.g. Eric)…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleQueryScan(); }}
              />
            </div>
            <button
              type="button"
              disabled={queryScanning || !search.trim() || !connected}
              onClick={handleQueryScan}
              title={connected ? 'Search all open Zoho tasks and interpret matches' : blockedReason}
              className="h-9 px-3.5 rounded-lg text-sm font-medium border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#09153b] text-[#172560] dark:text-white hover:bg-slate-50 dark:hover:bg-[#122254] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {queryScanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              <span className="hidden sm:inline">Search Zoho</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort</span>
            <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortKey)}>
              <SelectTrigger className="h-8 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="z-[100000]">
                {SORT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          No pending automations. Click “Scan open tasks” to interpret your open Zoho tasks into proposed actions.
        </div>
      ) : visibleProposals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm space-y-3">
          <div>No pending proposals match “{search}”.</div>
          {search.trim() && (
            <Button variant="outline" size="sm" disabled={queryScanning || !connected} onClick={handleQueryScan}>
              {queryScanning ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Search className="h-4 w-4 mr-1.5" />}
              Search all Zoho tasks for “{search.trim()}”
            </Button>
          )}
          {search.trim() && visibleHistory.length > 0 && (
            <div className="text-xs">{visibleHistory.length} matching item(s) in History below. Likely skipped (e.g. no LinkedIn URL, or unsupported channel).</div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {visibleProposals.map((a) => (
            <div key={a.id} className="rounded-lg border border-slate-200 dark:border-blue-950/40 bg-slate-50/50 dark:bg-[#040b25] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  {channelIcon(a.channel)}
                  <span className="text-sm font-semibold text-[#172560] dark:text-white truncate">{a.subject || 'Task'}</span>
                  {a.action && <Badge variant="secondary" className="capitalize bg-slate-100 dark:bg-[#0e1d4d] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-blue-950/40">{a.action.replace(/_/g, ' ')}</Badge>}
                  {a.status === 'failed' && <Badge variant="secondary" className="bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50">retry</Badge>}
                </div>
                <span className="text-xs text-slate-500 dark:text-[#7a8ba3] truncate">{a.contact_name} · {targetLabel(a)}</span>
              </div>

              <textarea
                className="w-full rounded-md border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-slate-800/50 text-[#172560] dark:text-white placeholder:text-slate-400 px-3 py-2 text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={drafts[a.id] ?? a.message ?? ''}
                onChange={(e) => setDrafts((d) => ({ ...d, [a.id]: e.target.value }))}
              />

              {a.error && <p className="text-xs text-red-600 dark:text-red-400">{a.error}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  // Also gated on `connected`. Proposals OUTLIVE the Zoho
                  // connection that produced them — they are rows in the
                  // tenant DB, not live Zoho data — so after a disconnect this
                  // list still renders them with a live-looking button. The
                  // backend already refuses (it fetches the Zoho token before
                  // sending, so nothing goes out), but an enabled button that
                  // cannot succeed reads as "these are ready to send" for
                  // messages drafted against an account we no longer have.
                  // Scan and Search were already gated this way.
                  disabled={busyId === a.id || !enabled || !connected}
                  onClick={() => handleApprove(a)}
                  title={connected ? undefined : blockedReason}
                  className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-primary/95 hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-700 inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {busyId === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                  Approve & send
                </button>
                <button
                  type="button"
                  disabled={busyId === a.id}
                  onClick={() => handleReject(a)}
                  className="h-8 px-3 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] hover:bg-slate-50 dark:hover:bg-[#0e1d4d] inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-blue-950/40">
          <button onClick={() => setShowHistory((v) => !v)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            {showHistory ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            History ({search.trim() ? `${visibleHistory.length} of ${history.length}` : history.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-1">
              {visibleHistory.length === 0 && (
                <div className="text-xs text-muted-foreground py-1">No history matches “{search}”.</div>
              )}
              {visibleHistory.slice(0, 50).map((a) => (
                <div key={a.id} className="flex items-center justify-between gap-2 text-xs py-1">
                  <span className="flex items-center gap-1.5 min-w-0">
                    {a.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      : a.status === 'rejected' ? <X className="h-3.5 w-3.5 text-muted-foreground" />
                      : <Ban className="h-3.5 w-3.5 text-muted-foreground" />}
                    <span className="text-foreground truncate">{a.subject || 'Task'}</span>
                    <span className="text-muted-foreground truncate">: {a.contact_name || ''}</span>
                  </span>
                  <span className="text-muted-foreground capitalize flex-shrink-0">
                    {a.status === 'skipped' ? (a.reason || 'skipped') : a.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ZohoAutomationsPanel;
