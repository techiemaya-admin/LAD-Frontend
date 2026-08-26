'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Loader2, Download, Search, ChevronLeft, ChevronRight, Mail, Phone, Building2,
  Users, Briefcase, Contact, CheckSquare, AlertCircle, CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

const ZOHO_API = '/api/social-integration/zoho';

type RecordType = 'contacts' | 'leads' | 'deals' | 'tasks';

interface ZohoStatus {
  connected: boolean;
  /**
   * The server could not DETERMINE the connection state (its status lookup
   * threw). `connected` is false only because we do not know — treating that as
   * "not connected" told tenants with a working Zoho to go and connect it.
   * Optional: older backends omit it, and `undefined` reads as "we do know".
   */
  status_unavailable?: boolean;
  last_synced?: string;
  counts?: { contacts?: number; leads?: number; deals?: number; tasks?: number } | null;
  syncing?: boolean;
  sync_error?: string | Record<string, string> | null;
}

interface CRMRecord {
  id: string;
  source_id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  title?: string | null;
  tags?: string[];
  synced_at?: string;
  deal_name?: string | null;
  stage?: string | null;
  amount?: number | null;
  account_name?: string | null;
  contact_name?: string | null;
  subject?: string | null;
  priority?: string | null;
  due_date?: string | null;
  related_to?: string | null;
  status?: string | null;
}

const DEFAULT_PAGE_SIZE = 25;

function initialsOf(name?: string | null): string {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const ZohoRecordsBrowser: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<ZohoStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const [recordType, setRecordType] = useState<RecordType>('contacts');
  const [records, setRecords] = useState<CRMRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);
  // A failed records fetch used to be indistinguishable from a successful empty
  // one: both paths below just cleared the list, and the empty state then said
  // "No {type} synced yet. Click 'Sync from Zoho' to pull them in." — telling a
  // tenant who has synced thousands of records that they have none, and
  // inviting a pointless full re-sync.
  const [recordsError, setRecordsError] = useState(false);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollingRef = useRef(false);
  const listContainerRef = useRef<HTMLDivElement>(null);

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/status`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data?.data || null);
        return data?.data as ZohoStatus | null;
      }
    } catch { /* ignore */ }
    setStatus(null);
    return null;
  }, []);

  useEffect(() => {
    (async () => { await checkStatus(); setLoading(false); })();
  }, [checkStatus]);

  // Same response-race guard as the Sales funnel widget. loadRecords takes the
  // varying key (record type / page / search) as ARGUMENTS, so switching tabs,
  // paging or typing fires a new request without cancelling the previous one.
  // Nothing here stops an earlier request that lands late from overwriting a
  // newer one — and because the stale branch also calls setPage(p), it would
  // snap the pager back to the page the user already navigated away from.
  const recordsSeq = useRef(0);

  const loadRecords = useCallback(async (type: RecordType, p: number, q: string, size?: number) => {
    const limit = size ?? pageSize;
    const seq = ++recordsSeq.current;
    const isStale = () => seq !== recordsSeq.current;
    setRecordsLoading(true);
    try {
      const params = new URLSearchParams({ type, page: String(p), limit: String(limit) });
      if (q) params.set('search', q);
      const res = await fetchWithTenant(`${ZOHO_API}/records/local?${params.toString()}`);
      const data = await res.json();
      if (isStale()) return;
      if (res.ok && data?.success) {
        setRecords(data.data || []);
        setTotal(data.total || 0);
        setPage(p);
        setRecordsError(false);
      } else {
        setRecords([]); setTotal(0); setRecordsError(true);
      }
    } catch {
      if (isStale()) return;
      setRecords([]); setTotal(0); setRecordsError(true);
    } finally {
      // Only the newest request may clear the spinner or yank the list back to
      // the top; a stale one doing either fights the request still in flight.
      if (!isStale()) {
        setRecordsLoading(false);
        listContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }, [pageSize]);

  useEffect(() => {
    if (status?.connected) loadRecords(recordType, 1, '', pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, recordType]);

  const formatSyncError = (e: unknown): string => {
    if (!e) return '';
    if (typeof e === 'string') return e;
    if (typeof e === 'object') return Object.entries(e as Record<string, string>).map(([k, v]) => `${k} (${v})`).join('; ');
    return String(e);
  };

  const pollSyncStatus = useCallback(() => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    let tries = 0;
    const tick = async () => {
      tries += 1;
      try {
        const res = await fetchWithTenant(`${ZOHO_API}/status`);
        const data = await res.json();
        const d = data?.data;
        if (d && !d.syncing) {
          pollingRef.current = false;
          setSyncing(false);
          setStatus(d);
          if (d.sync_error) setError(`Some modules failed to sync: ${formatSyncError(d.sync_error)}`);
          else {
            const c = d.counts || {};
            setSuccess(`Synced ${c.contacts || 0} contacts, ${c.leads || 0} leads, ${c.deals || 0} deals, ${c.tasks || 0} tasks.`);
          }
          loadRecords(recordType, 1, search, pageSize);
          return;
        }
      } catch { /* transient */ }
      if (tries < 120) setTimeout(tick, 3000);
      else { pollingRef.current = false; setSyncing(false); setError('Sync is taking longer than expected - refresh shortly.'); }
    };
    setTimeout(tick, 3000);
  }, [loadRecords, recordType, search, pageSize]);

  // Resume tracking if a sync is already running when the page opens.
  useEffect(() => {
    if (status?.syncing && !pollingRef.current) { setSyncing(true); pollSyncStatus(); }
  }, [status?.syncing, pollSyncStatus]);

  const handleSync = async () => {
    setSyncing(true); setError(null); setSuccess(null);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data?.success) {
        setSuccess('Sync started - pulling from Zoho. This can take a minute for large accounts…');
        pollSyncStatus();
      } else { setSyncing(false); setError(data?.error || 'Sync failed'); }
    } catch { setSyncing(false); setError('Sync failed'); }
  };

  const onSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => loadRecords(recordType, 1, value, pageSize), 350);
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 dark:text-[#7a8ba3]">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading Zoho CRM…
      </div>
    );
  }

  // We could not read the status. Saying "isn't connected" here sent tenants
  // whose Zoho works fine off to reconnect it, and hid the records they had
  // already synced — see the backend fix that added this flag.
  if (status?.status_unavailable) {
    return (
      <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/20 p-8 text-center space-y-2">
        <div className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Couldn’t check your Zoho connection
        </div>
        <p className="text-sm text-amber-700 dark:text-amber-400/80">
          This isn’t “not connected” — we couldn’t reach the connection status just now,
          so your synced records aren’t shown. Please try again shortly.
        </p>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-8 text-center space-y-2">
        <div className="text-sm font-medium text-[#172560] dark:text-white">Zoho CRM isn’t connected</div>
        <p className="text-sm text-slate-500 dark:text-[#7a8ba3]">
          Connect Zoho in <a href="/settings?tab=integrations" className="underline text-blue-600 dark:text-blue-400">Settings → Integrations</a> to sync and browse your Contacts, Leads, Deals, and Tasks here.
        </p>
      </div>
    );
  }

  const c = status.counts || {};

  const iconForKey = (k: string) => {
    if (k === 'contacts') return <Contact className="h-4 w-4" />;
    if (k === 'leads') return <Users className="h-4 w-4" />;
    if (k === 'deals') return <Briefcase className="h-4 w-4" />;
    return <CheckSquare className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Header: counts + sync */}
      <div className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1 min-w-[280px]">
            {(['contacts', 'leads', 'deals', 'tasks'] as const).map((k) => (
              <div key={k} className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-slate-50 dark:bg-[#040b25] p-3.5 flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-[#0e1d4d] text-blue-600 dark:text-blue-400 grid place-items-center shrink-0">
                  {iconForKey(k)}
                </div>
                <div>
                  <div className="text-xl font-bold text-[#172560] dark:text-white tabular-nums leading-none">{c[k] ?? '0'}</div>
                  <div className="text-xs text-slate-500 dark:text-[#7a8ba3] capitalize mt-1 font-medium">{k}</div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white bg-primary/95 hover:bg-primary/90 dark:bg-blue-600 dark:hover:bg-blue-700 transition-all disabled:opacity-50 shrink-0 cursor-pointer disabled:cursor-not-allowed"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {syncing ? 'Syncing…' : 'Sync from Zoho'}
          </button>
        </div>
        {status.last_synced && (
          <p className="text-xs text-slate-500 dark:text-[#7a8ba3]">Last synced {new Date(status.last_synced).toLocaleString()}</p>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 p-3 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> {success}
          </div>
        )}
      </div>

      {/* Records browser */}
      <div className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-5 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4 shrink-0">
          <div className="flex gap-1.5 bg-slate-100 dark:bg-[#040b25] p-1 rounded-xl border border-slate-200 dark:border-blue-950/40">
            {(['contacts', 'leads', 'deals', 'tasks'] as RecordType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setRecordType(t); setSearch(''); }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize flex items-center gap-1.5 transition-all cursor-pointer ${
                  recordType === t
                    ? 'bg-primary/95 dark:bg-[#2563eb] text-white shadow-xs'
                    : 'text-slate-600 dark:text-[#7a8ba3] hover:text-[#172560] dark:hover:text-white hover:bg-white dark:hover:bg-[#0e1d4d]'
                }`}
              >
                {t === 'contacts' && <Contact className="h-3.5 w-3.5" />}
                {t === 'leads' && <Users className="h-3.5 w-3.5" />}
                {t === 'deals' && <Briefcase className="h-3.5 w-3.5" />}
                {t === 'tasks' && <CheckSquare className="h-3.5 w-3.5" />}
                {t}
              </button>
            ))}
          </div>
          <div className="relative flex items-center w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              className="w-full pl-9 pr-3 h-9 rounded-lg text-xs border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-slate-800/50 text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={`Search ${recordType}…`}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {recordsLoading ? (
          <div className="flex items-center justify-center py-12 text-slate-500 dark:text-[#7a8ba3]">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading {recordType}…
          </div>
        ) : recordsError ? (
          <div className="text-center py-12 text-rose-600 dark:text-rose-300 text-sm">
            Couldn&apos;t load your {recordType}. This is a loading problem, not an empty
            sync — please try again.
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-[#7a8ba3] text-sm">
            No {recordType} synced yet. Click “Sync from Zoho” to pull them in.
          </div>
        ) : (
          <div
            ref={listContainerRef}
            className="max-h-[500px] overflow-y-auto custom-scrollbar pr-1 divide-y divide-slate-100 dark:divide-[#132247]"
          >
            {records.map((r) => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-[#0a173d]/50 px-2 rounded-lg transition-colors cursor-pointer">
                {recordType === 'deals' ? (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-[#162752] text-blue-800 dark:text-blue-200 text-xs font-bold grid place-items-center shrink-0">
                        {initialsOf(r.deal_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#172560] dark:text-white truncate">{r.deal_name || 'Untitled deal'}</div>
                        <div className="text-[11px] text-slate-500 dark:text-[#7a8ba3] truncate">
                          {[r.account_name, r.contact_name].filter(Boolean).join(' · ') || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        {r.stage && <Badge variant="secondary" className="bg-slate-100 dark:bg-[#0e1d4d] text-slate-700 dark:text-slate-300 text-[10px]">{r.stage}</Badge>}
                        {r.amount != null && <div className="text-xs font-bold text-[#172560] dark:text-white mt-0.5">{r.amount.toLocaleString()}</div>}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                    </div>
                  </>
                ) : recordType === 'tasks' ? (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-[#162752] text-blue-800 dark:text-blue-200 text-xs font-bold grid place-items-center shrink-0">
                        {initialsOf(r.subject)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#172560] dark:text-white truncate">{r.subject || 'Untitled task'}</div>
                        <div className="text-[11px] text-slate-500 dark:text-[#7a8ba3] flex flex-wrap gap-x-3 gap-y-0.5">
                          {r.related_to && <span className="truncate">{r.related_to}</span>}
                          {r.due_date && <span>Due {new Date(r.due_date).toLocaleDateString()}</span>}
                          {r.priority && <span>{r.priority} priority</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {r.status && <Badge variant="secondary" className="bg-slate-100 dark:bg-[#0e1d4d] text-slate-700 dark:text-slate-300 text-[10px]">{r.status}</Badge>}
                      <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-[#162752] text-blue-800 dark:text-blue-200 text-xs font-bold grid place-items-center shrink-0">
                        {initialsOf(r.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-[#172560] dark:text-white truncate">{r.name || '-'}</div>
                        <div className="text-[11px] text-slate-500 dark:text-[#7a8ba3] flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                          {r.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{r.email}</span>}
                          {r.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{r.phone}</span>}
                          {r.company_name && <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" />{r.company_name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {r.title && <span className="text-[11px] text-slate-500 dark:text-[#7a8ba3]">{r.title}</span>}
                      <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-600" />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3.5 mt-3 border-t border-slate-100 dark:border-[#132247] shrink-0">
            <div className="text-xs text-slate-500 dark:text-[#7a8ba3] font-medium">
              Showing {Math.min((page - 1) * pageSize + 1, total).toLocaleString()}-{Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()} {recordType}
              {totalPages > 1 && <span className="ml-1 opacity-80">(Page {page} of {totalPages})</span>}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#7a8ba3]">
                <span>Per page:</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(val) => {
                    const newSize = Number(val);
                    setPageSize(newSize);
                    loadRecords(recordType, 1, search, newSize);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-7 text-xs border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-slate-800/50 text-[#172560] dark:text-white focus:ring-0 shadow-none">
                    <SelectValue placeholder={String(pageSize)} />
                  </SelectTrigger>
                  
                  <SelectContent 
                    position="popper" 
                    side="top" 
                    sideOffset={4}
                    className="bg-white dark:bg-[#071131] border-slate-200 dark:border-blue-950/40 min-w-[70px] w-[70px] p-1"
                  >
                    {[15, 25, 50, 100].map((size) => (
                      <SelectItem
                        key={size}
                        value={String(size)}
                        className="text-xs text-slate-800 dark:text-slate-100 cursor-pointer rounded-sm pl-2 pr-5 py-1 transition-colors hover:bg-[#0B1957] hover:text-white focus:bg-[#0B1957] focus:text-white data-[state=checked]:font-semibold data-[state=checked]:bg-[#0B1957] data-[state=checked]:text-white dark:hover:bg-[#2563eb] dark:hover:text-white dark:focus:bg-[#2563eb] dark:focus:text-white dark:data-[state=checked]:bg-[#2563eb] dark:data-[state=checked]:text-white"
                      >
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
            </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page <= 1 || recordsLoading}
                  onClick={() => loadRecords(recordType, page - 1, search, pageSize)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#03091e] flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#0e1d4d] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Prev</span>
                </button>
                <span className="text-xs px-2 font-semibold text-[#172560] dark:text-white tabular-nums">
                  {page} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages || recordsLoading}
                  onClick={() => loadRecords(recordType, page + 1, search, pageSize)}
                  className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#03091e] flex items-center gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-[#0e1d4d] transition-colors cursor-pointer disabled:cursor-not-allowed"
                  title="Next Page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ZohoRecordsBrowser;
