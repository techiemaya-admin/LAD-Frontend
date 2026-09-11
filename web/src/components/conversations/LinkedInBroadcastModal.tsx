'use client';

/**
 * LinkedIn Broadcast modal.
 *
 * Purpose-built for the rate-limited LinkedIn reality (NOT a fork of the
 * WhatsApp BroadcastModal, whose naive client-side per-recipient fan-out would
 * get LinkedIn accounts restricted). Flow:
 *   1. Audience - pick or build a broadcast group from campaign-accepted connections.
 *   2. Message - pick a saved LinkedIn template.
 *   3. Queue - POST /send returns 202 + an ETA; the backend drips the sends over
 *      days within each account's daily cap. Progress shows in the Runs tab.
 *
 * All data is reached under /api/campaigns/linkedin-broadcast/* via fetchWithTenant.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Megaphone, X, Users, Send, Loader2, RefreshCw, Plus,
  CheckCircle, Clock, AlertCircle, Ban, Briefcase, Eye, MessageSquare,
} from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { cn } from '@/lib/utils';

const BASE = '/api/campaigns/linkedin-broadcast';

interface Group { id: string; name: string; member_count: number; source_type?: string; }
interface Campaign { campaign_id: string; name: string; accepted_count: number; not_responded_count: number; }
interface Template { id: string; name: string; content?: string; category?: string; }
interface Run {
  id: string; name?: string; status: string; recipient_count: number;
  sent_count: number; failed_count: number; skipped_count: number;
  seen_count?: number; replied_count?: number;
  group_name?: string | null; template_name?: string | null;
  daily_cap?: number; created_at?: string; started_at?: string; completed_at?: string;
  error_message?: string;
}

interface Props { onClose: () => void; }

/**
 * Audience label for a history row. The group is what the user actually picked,
 * so it leads; a run created from an ad-hoc recipient list has no group, hence
 * the run-name → template-name → generic fallback chain.
 */
function runLabel(r: Run) {
  return r.group_name || r.name || r.template_name || 'Broadcast';
}

/** "3 Aug 2026, 14:32" - the send date, or the queue date if it never started. */
function formatSentAt(r: Run) {
  const raw = r.started_at || r.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

async function getJson(url: string, init?: RequestInit) {
  const res = await fetchWithTenant(url, init);
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

const STATUS_META: Record<string, { label: string; cls: string; icon: JSX.Element }> = {
  queued: {
    label: 'Queued',
    cls: 'text-amber-700 bg-amber-50 border border-amber-200/80 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800/50',
    icon: <Clock className="h-3 w-3" />,
  },
  running: {
    label: 'Sending',
    cls: 'text-blue-700 bg-blue-50 border border-blue-200/80 dark:text-blue-400 dark:bg-blue-950/40 dark:border-blue-800/50',
    icon: <Loader2 className="h-3 w-3 animate-spin" />,
  },
  paused_rate_limited: {
    label: 'Paused (daily cap)',
    cls: 'text-amber-700 bg-amber-50 border border-amber-200/80 dark:text-amber-400 dark:bg-amber-950/40 dark:border-amber-800/50',
    icon: <Clock className="h-3 w-3" />,
  },
  paused_credits: {
    label: 'Paused (credits)',
    cls: 'text-red-700 bg-red-50 border border-red-200/80 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800/50',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  completed: {
    label: 'Completed',
    cls: 'text-emerald-700 bg-emerald-50 border border-emerald-200/80 dark:text-emerald-400 dark:bg-emerald-950/40 dark:border-emerald-800/50',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  failed: {
    label: 'Failed',
    cls: 'text-red-700 bg-red-50 border border-red-200/80 dark:text-red-400 dark:bg-red-950/40 dark:border-red-800/50',
    icon: <AlertCircle className="h-3 w-3" />,
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'text-slate-600 bg-slate-100 border border-slate-200/80 dark:text-slate-400 dark:bg-slate-800/60 dark:border-slate-700/50',
    icon: <Ban className="h-3 w-3" />,
  },
};

export default function LinkedInBroadcastModal({ onClose }: Props) {
  const [tab, setTab] = useState<'compose' | 'runs'>('compose');
  const [groups, setGroups] = useState<Group[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [excludeResponded, setExcludeResponded] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const loadGroups = useCallback(async () => {
    const { data } = await getJson(`${BASE}/groups`);
    setGroups(Array.isArray(data.data) ? data.data : []);
  }, []);
  const loadTemplates = useCallback(async () => {
    const { data } = await getJson(`${BASE}/templates`);
    setTemplates(Array.isArray(data.data) ? data.data : []);
  }, []);
  const loadRuns = useCallback(async () => {
    const { data } = await getJson(`${BASE}/runs`);
    setRuns(Array.isArray(data.data) ? data.data : []);
  }, []);
  const loadCampaigns = useCallback(async () => {
    const { data } = await getJson(`${BASE}/campaigns`);
    setCampaigns(Array.isArray(data.data) ? data.data : []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadGroups(), loadCampaigns(), loadTemplates(), loadRuns()]);
      setLoading(false);
    })();
  }, [loadGroups, loadCampaigns, loadTemplates, loadRuns]);

  // Poll runs while the Runs tab is open (drip progresses server-side).
  useEffect(() => {
    if (tab !== 'runs') return;
    const t = setInterval(loadRuns, 8000);
    return () => clearInterval(t);
  }, [tab, loadRuns]);

  const chosenCampaign = campaigns.find((c) => c.campaign_id === selectedCampaign);
  const audienceCount = chosenCampaign ? (excludeResponded ? chosenCampaign.not_responded_count : chosenCampaign.accepted_count) : 0;

  const createGroupFromAccepted = async () => {
    if (!selectedCampaign || !chosenCampaign) { setNotice({ kind: 'err', text: 'Select a campaign first' }); return; }
    const suffix = excludeResponded ? ' - not responded' : ' - accepted';
    const name = (newGroupName.trim() || `${chosenCampaign.name}${suffix}`).slice(0, 200);
    setBusy('create');
    setNotice(null);
    try {
      const created = await getJson(`${BASE}/groups`, { method: 'POST', body: JSON.stringify({ name, source_type: 'campaign_accepted' }) });
      if (!created.ok) { setNotice({ kind: 'err', text: created.data?.error || 'Could not create group' }); return; }
      const groupId = created.data.data.id;
      const mat = await getJson(`${BASE}/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ source: 'campaign_accepted', campaign_id: selectedCampaign, exclude_responded: excludeResponded }),
      });
      if (!mat.ok) { setNotice({ kind: 'err', text: mat.data?.error || 'Group created but adding members failed' }); }
      else {
        const { added, skipped, member_count } = mat.data.data;
        setNotice({ kind: 'ok', text: `Added ${added} connection(s)${skipped ? ` - ${skipped} skipped (no LinkedIn id)` : ''}. Group has ${member_count}.` });
      }
      setNewGroupName('');
      await loadGroups();
      setSelectedGroup(groupId);
    } finally {
      setBusy(null);
    }
  };

  const rebuildGroup = async (groupId: string) => {
    setBusy(`rebuild-${groupId}`);
    try {
      const mat = await getJson(`${BASE}/groups/${groupId}/members`, { method: 'POST', body: JSON.stringify({ source: 'campaign_accepted' }) });
      if (mat.ok) {
        const { added, skipped, member_count } = mat.data.data;
        setNotice({ kind: 'ok', text: `Refreshed - ${added} new, ${skipped} skipped, ${member_count} total.` });
      }
      await loadGroups();
    } finally {
      setBusy(null);
    }
  };

  const queueBroadcast = async () => {
    if (!selectedGroup || !selectedTemplate) return;
    setBusy('send');
    setNotice(null);
    try {
      const res = await getJson(`${BASE}/send`, { method: 'POST', body: JSON.stringify({ group_id: selectedGroup, template_id: selectedTemplate }) });
      if (res.status === 202 && res.data?.data) {
        const d = res.data.data;
        setNotice({ kind: 'ok', text: `${d.message} (${d.recipient_count} recipient(s)${d.skipped_no_member_id ? `, ${d.skipped_no_member_id} skipped` : ''})` });
        await loadRuns();
        setTab('runs');
      } else {
        setNotice({ kind: 'err', text: res.data?.error || 'Could not queue broadcast' });
      }
    } finally {
      setBusy(null);
    }
  };

  const cancelRun = async (runId: string) => {
    setBusy(`cancel-${runId}`);
    try {
      await getJson(`${BASE}/runs/${runId}`, { method: 'DELETE' });
      await loadRuns();
    } finally {
      setBusy(null);
    }
  };

  const chosenGroup = groups.find((g) => g.id === selectedGroup);
  const chosenTemplate = templates.find((t) => t.id === selectedTemplate);
  const canSend = !!selectedGroup && !!selectedTemplate && (chosenGroup?.member_count || 0) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 dark:bg-black/75 backdrop-blur-xs p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0B132B] text-slate-900 dark:text-slate-100 shadow-2xl border border-slate-200 dark:border-slate-800/80 max-h-[88vh] overflow-hidden flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#091024]/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#0A66C2] dark:text-blue-400 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="font-semibold text-base text-slate-900 dark:text-slate-100 leading-tight">LinkedIn Broadcast</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Drip campaigns safely within LinkedIn limits</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800/80 bg-slate-50/30 dark:bg-[#091024]/30 px-5 text-sm gap-6">
          {(['compose', 'runs'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "py-3 font-medium text-xs sm:text-sm capitalize transition-colors relative",
                tab === t
                  ? "text-[#0A66C2] dark:text-blue-400 font-semibold"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              {t === 'compose' ? 'New broadcast' : 'Sending history'}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0A66C2] dark:bg-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        {notice && (
          <div
            className={cn(
              "mx-5 mt-4 rounded-xl px-3.5 py-2.5 text-xs font-medium border flex items-center gap-2",
              notice.kind === 'ok'
                ? "bg-emerald-50 text-emerald-800 border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                : "bg-red-50 text-red-800 border-red-200/80 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/50"
            )}
          >
            {notice.kind === 'ok' ? <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> : <AlertCircle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />}
            <span>{notice.text}</span>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-5 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-[#0A66C2] dark:text-blue-400 mb-2" />
              <span className="text-xs">Loading broadcast data…</span>
            </div>
          ) : tab === 'compose' ? (
            <div className="space-y-5">
              {/* Drip reality note */}
              <div className="rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 text-blue-950 dark:text-blue-200 text-xs p-3 leading-relaxed flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-[#0A66C2] dark:text-blue-400 mt-0.5 shrink-0" />
                <div>
                  LinkedIn caps how many messages an account can send per day, so a broadcast <strong className="font-semibold text-[#0A66C2] dark:text-blue-300">drips</strong> out safely over hours/days within daily limits. You&apos;ll get an ETA upon queuing.
                </div>
              </div>

              {/* Audience */}
              <section>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                  <Users className="h-3.5 w-3.5 text-[#0A66C2] dark:text-blue-400" />
                  <span>Audience</span>
                </div>
                {groups.length > 0 ? (
                  <div className="space-y-2 mb-3">
                    {groups.map((g) => {
                      const isSelected = selectedGroup === g.id;
                      return (
                        <label
                          key={g.id}
                          className={cn(
                            "flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-all",
                            isSelected
                              ? "border-[#0A66C2] dark:border-blue-500/60 bg-blue-50/40 dark:bg-blue-950/20 ring-1 ring-[#0A66C2]/20 dark:ring-blue-500/20"
                              : "border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-100/70 dark:hover:bg-slate-800/40"
                          )}
                        >
                          <input
                            type="radio"
                            name="grp"
                            className="accent-[#0A66C2] dark:accent-blue-500 h-4 w-4"
                            checked={isSelected}
                            onChange={() => setSelectedGroup(g.id)}
                          />
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 flex-1 truncate">{g.name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-normal">
                            {g.member_count} connection{g.member_count === 1 ? '' : 's'}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); rebuildGroup(g.id); }}
                            disabled={busy === `rebuild-${g.id}`}
                            title="Refresh from accepted connections"
                            className="p-1 rounded-lg text-slate-400 hover:text-[#0A66C2] dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60 transition-colors"
                          >
                            {busy === `rebuild-${g.id}` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </label>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">No broadcast groups yet. Create one from your accepted connections below.</p>
                )}

                {/* Build a new group from a campaign's accepted connections */}
                <div className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/30 p-3.5 space-y-3">
                  <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5 text-[#0A66C2] dark:text-blue-400" />
                    <span>New group from a campaign</span>
                  </div>
                  {campaigns.length === 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">No campaigns with accepted LinkedIn connections yet.</p>
                  ) : (
                    <>
                      <select
                        value={selectedCampaign}
                        onChange={(e) => { setSelectedCampaign(e.target.value); setNewGroupName(''); }}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1527] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0A66C2] dark:focus:border-blue-500"
                      >
                        <option value="">Select a campaign…</option>
                        {campaigns.map((c) => (
                          <option key={c.campaign_id} value={c.campaign_id}>
                            {c.name} ({c.accepted_count} accepted)
                          </option>
                        ))}
                      </select>

                      {chosenCampaign && (
                        <div className="space-y-1.5 pl-0.5 text-xs text-slate-700 dark:text-slate-300">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="acceptance_filter"
                              className="accent-[#0A66C2] dark:accent-blue-500"
                              checked={!excludeResponded}
                              onChange={() => setExcludeResponded(false)}
                            />
                            <span>All accepted <span className="text-slate-400 dark:text-slate-500">({chosenCampaign.accepted_count})</span></span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              name="acceptance_filter"
                              className="accent-[#0A66C2] dark:accent-blue-500"
                              checked={excludeResponded}
                              onChange={() => setExcludeResponded(true)}
                            />
                            <span>Accepted, excluding responded <span className="text-slate-400 dark:text-slate-500">({chosenCampaign.not_responded_count})</span></span>
                          </label>
                        </div>
                      )}

                      <input
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder={chosenCampaign ? `${chosenCampaign.name}${excludeResponded ? ' - not responded' : ' - accepted'}` : 'Group name (optional)'}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1527] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0A66C2] dark:focus:border-blue-500"
                      />

                      <button
                        onClick={createGroupFromAccepted}
                        disabled={!selectedCampaign || busy === 'create'}
                        className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#0A66C2] hover:bg-[#095196] dark:bg-blue-600 dark:hover:bg-blue-500 px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 shadow-xs"
                      >
                        {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Build group{chosenCampaign ? ` (${audienceCount})` : ''}
                      </button>
                    </>
                  )}
                </div>
              </section>

              {/* Message */}
              <section>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
                  <Send className="h-3.5 w-3.5 text-[#0A66C2] dark:text-blue-400" />
                  <span>Message</span>
                </div>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1527] px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#0A66C2] dark:focus:border-blue-500"
                >
                  <option value="">Select a saved LinkedIn template…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
                {templates.length === 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">No LinkedIn templates found. Create one under Campaigns → LinkedIn templates.</p>
                )}
                {chosenTemplate?.content && (
                  <div className="mt-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800/80 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap max-h-28 overflow-y-auto leading-relaxed">
                    {chosenTemplate.content}
                  </div>
                )}
              </section>

              {/* Queue */}
              <div className="pt-2">
                {chosenGroup && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2.5 text-center">
                    Will drip to <strong className="text-slate-800 dark:text-slate-200 font-semibold">{chosenGroup.member_count}</strong> connection{chosenGroup.member_count === 1 ? '' : 's'} from “{chosenGroup.name}”.
                  </p>
                )}
                <button
                  onClick={queueBroadcast}
                  disabled={!canSend || busy === 'send'}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#0A66C2] hover:bg-[#095196] dark:bg-blue-600 dark:hover:bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-md shadow-[#0A66C2]/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Queue broadcast
                </button>
              </div>
            </div>
          ) : (
            /* Runs */
            <div className="space-y-3">
              <div className="flex justify-end">
                <button
                  onClick={loadRuns}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/60"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
              {runs.length === 0 ? (
                <div className="text-center py-12">
                  <Megaphone className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">No broadcasts yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Queued broadcasts will display their delivery and engagement status here.</p>
                </div>
              ) : runs.map((r) => {
                const meta = STATUS_META[r.status] || STATUS_META.queued;
                const total = r.recipient_count || 0;
                const done = (r.sent_count || 0) + (r.failed_count || 0) + (r.skipped_count || 0);
                const pct = total ? Math.round((done / total) * 100) : 0;
                const active = ['queued', 'running', 'paused_rate_limited', 'paused_credits'].includes(r.status);
                const sentAt = formatSentAt(r);
                const seen = r.seen_count || 0;
                const replied = r.replied_count || 0;
                const sent = r.sent_count || 0;
                // Percentages are of what actually went out - "12 seen of 36 queued"
                // would understate a broadcast still mid-drip.
                const rate = (n: number) => (sent ? Math.round((n / sent) * 100) : 0);
                return (
                  <div
                    key={r.id}
                    className="rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 p-3.5 space-y-2 hover:border-slate-300 dark:hover:border-slate-700/80 transition-colors shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={runLabel(r)}>{runLabel(r)}</p>
                        {sentAt && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{sentAt}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>{meta.icon}{meta.label}</span>
                        {active && (
                          <button
                            onClick={() => cancelRun(r.id)}
                            disabled={busy === `cancel-${r.id}`}
                            className="text-[11px] text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {sent}/{total} sent
                      {r.failed_count ? ` · ${r.failed_count} failed` : ''}
                      {r.skipped_count ? ` · ${r.skipped_count} skipped` : ''}
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full bg-[#0A66C2] dark:bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                    </div>
                    {sent > 0 && (
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                        <span className="inline-flex items-center gap-1" title="Recipients who opened the message. LinkedIn only reports a read receipt when the recipient has them switched on, so this is a minimum.">
                          <Eye className="h-3.5 w-3.5 text-slate-400" />
                          <strong className="text-slate-800 dark:text-slate-200 font-medium">{seen}</strong> seen
                          <span className="text-slate-400">({rate(seen)}%)</span>
                        </span>
                        <span className="inline-flex items-center gap-1" title="Recipients who replied in the thread after this broadcast.">
                          <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                          <strong className="text-slate-800 dark:text-slate-200 font-medium">{replied}</strong> replied
                          <span className="text-slate-400">({rate(replied)}%)</span>
                        </span>
                      </div>
                    )}
                    {r.error_message && (
                      <p className="mt-1 text-[11px] text-red-500 dark:text-red-400 bg-red-50/50 dark:bg-red-950/30 p-1.5 rounded-md border border-red-100 dark:border-red-900/30">
                        {r.error_message}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
