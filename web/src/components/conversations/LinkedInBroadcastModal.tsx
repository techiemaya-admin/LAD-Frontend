'use client';

/**
 * LinkedIn Broadcast modal.
 *
 * Purpose-built for the rate-limited LinkedIn reality (NOT a fork of the
 * WhatsApp BroadcastModal, whose naive client-side per-recipient fan-out would
 * get LinkedIn accounts restricted). Flow:
 *   1. Audience — pick or build a broadcast group from campaign-accepted connections.
 *   2. Message — pick a saved LinkedIn template.
 *   3. Queue — POST /send returns 202 + an ETA; the backend drips the sends over
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

/** "3 Aug 2026, 14:32" — the send date, or the queue date if it never started. */
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
  queued: { label: 'Queued', cls: 'text-amber-600 bg-amber-50', icon: <Clock className="h-3 w-3" /> },
  running: { label: 'Sending', cls: 'text-blue-600 bg-blue-50', icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  paused_rate_limited: { label: 'Paused (daily cap)', cls: 'text-amber-600 bg-amber-50', icon: <Clock className="h-3 w-3" /> },
  paused_credits: { label: 'Paused (credits)', cls: 'text-red-600 bg-red-50', icon: <AlertCircle className="h-3 w-3" /> },
  completed: { label: 'Completed', cls: 'text-green-600 bg-green-50', icon: <CheckCircle className="h-3 w-3" /> },
  failed: { label: 'Failed', cls: 'text-red-600 bg-red-50', icon: <AlertCircle className="h-3 w-3" /> },
  cancelled: { label: 'Cancelled', cls: 'text-slate-500 bg-slate-100', icon: <Ban className="h-3 w-3" /> },
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
    const suffix = excludeResponded ? ' — not responded' : ' — accepted';
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
        setNotice({ kind: 'ok', text: `Added ${added} connection(s)${skipped ? ` — ${skipped} skipped (no LinkedIn id)` : ''}. Group has ${member_count}.` });
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
        setNotice({ kind: 'ok', text: `Refreshed — ${added} new, ${skipped} skipped, ${member_count} total.` });
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-card shadow-xl border border-border max-h-[88vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-foreground">LinkedIn Broadcast</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border text-sm">
          {(['compose', 'runs'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-5 py-2.5 font-medium capitalize ${tab === t ? 'text-blue-600 border-b-2 border-blue-600' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'compose' ? 'New broadcast' : 'Sending history'}
            </button>
          ))}
        </div>

        {notice && (
          <div className={`mx-5 mt-3 rounded-md px-3 py-2 text-xs ${notice.kind === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {notice.text}
          </div>
        )}

        <div className="p-5 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : tab === 'compose' ? (
            <div className="space-y-5">
              {/* Drip reality note */}
              <div className="rounded-md bg-blue-50 text-blue-800 text-xs px-3 py-2 leading-relaxed">
                LinkedIn caps how many messages an account can send per day, so a broadcast <strong>drips</strong> out
                over hours/days within a safe limit — not all at once. You&apos;ll get an ETA when you queue it.
              </div>

              {/* Audience */}
              <section>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2"><Users className="h-4 w-4" /> Audience</div>
                {groups.length > 0 ? (
                  <div className="space-y-1.5 mb-3">
                    {groups.map((g) => (
                      <label key={g.id} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 cursor-pointer hover:bg-muted">
                        <input type="radio" name="grp" checked={selectedGroup === g.id} onChange={() => setSelectedGroup(g.id)} />
                        <span className="text-sm flex-1">{g.name}</span>
                        <span className="text-xs text-muted-foreground">{g.member_count} connection{g.member_count === 1 ? '' : 's'}</span>
                        <button type="button" onClick={(e) => { e.preventDefault(); rebuildGroup(g.id); }}
                          disabled={busy === `rebuild-${g.id}`} title="Refresh from accepted connections"
                          className="text-muted-foreground hover:text-blue-600">
                          {busy === `rebuild-${g.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                        </button>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mb-3">No broadcast groups yet. Create one from your accepted connections below.</p>
                )}
                {/* Build a new group from a campaign's accepted connections */}
                <div className="rounded-md border border-border p-3 space-y-2.5">
                  <div className="text-xs font-semibold text-foreground flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> New group from a campaign</div>
                  {campaigns.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No campaigns with accepted LinkedIn connections yet.</p>
                  ) : (
                    <>
                      <select value={selectedCampaign} onChange={(e) => { setSelectedCampaign(e.target.value); setNewGroupName(''); }}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                        <option value="">Select a campaign…</option>
                        {campaigns.map((c) => (
                          <option key={c.campaign_id} value={c.campaign_id}>{c.name} ({c.accepted_count} accepted)</option>
                        ))}
                      </select>

                      {chosenCampaign && (
                        <div className="space-y-1.5 pl-0.5">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="acceptance_filter" checked={!excludeResponded} onChange={() => setExcludeResponded(false)} />
                            <span>All accepted <span className="text-muted-foreground">({chosenCampaign.accepted_count})</span></span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input type="radio" name="acceptance_filter" checked={excludeResponded} onChange={() => setExcludeResponded(true)} />
                            <span>Accepted, excluding responded <span className="text-muted-foreground">({chosenCampaign.not_responded_count})</span></span>
                          </label>
                        </div>
                      )}

                      <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder={chosenCampaign ? `${chosenCampaign.name}${excludeResponded ? ' — not responded' : ' — accepted'}` : 'Group name (optional)'}
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />

                      <button onClick={createGroupFromAccepted} disabled={!selectedCampaign || busy === 'create'}
                        className="w-full inline-flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">
                        {busy === 'create' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Build group{chosenCampaign ? ` (${audienceCount})` : ''}
                      </button>
                    </>
                  )}
                </div>
              </section>

              {/* Message */}
              <section>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground mb-2"><Send className="h-4 w-4" /> Message</div>
                <select value={selectedTemplate} onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="">Select a saved LinkedIn template…</option>
                  {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                {templates.length === 0 && (
                  <p className="text-xs text-muted-foreground mt-1.5">No LinkedIn templates found. Create one under Campaigns → LinkedIn templates.</p>
                )}
                {chosenTemplate?.content && (
                  <div className="mt-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap max-h-28 overflow-y-auto">
                    {chosenTemplate.content}
                  </div>
                )}
              </section>

              {/* Queue */}
              <div className="pt-1">
                {chosenGroup && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Will drip to <strong>{chosenGroup.member_count}</strong> connection{chosenGroup.member_count === 1 ? '' : 's'} from “{chosenGroup.name}”.
                  </p>
                )}
                <button onClick={queueBroadcast} disabled={!canSend || busy === 'send'}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
                  {busy === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />} Queue broadcast
                </button>
              </div>
            </div>
          ) : (
            /* Runs */
            <div className="space-y-2">
              <div className="flex justify-end">
                <button onClick={loadRuns} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
              {runs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No broadcasts yet.</p>
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
                // Percentages are of what actually went out — "12 seen of 36 queued"
                // would understate a broadcast still mid-drip.
                const rate = (n: number) => (sent ? Math.round((n / sent) * 100) : 0);
                return (
                  <div key={r.id} className="rounded-md border border-border px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate" title={runLabel(r)}>{runLabel(r)}</p>
                        {sentAt && <p className="text-[11px] text-muted-foreground mt-0.5">{sentAt}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>{meta.icon}{meta.label}</span>
                        {active && (
                          <button onClick={() => cancelRun(r.id)} disabled={busy === `cancel-${r.id}`}
                            className="text-[11px] text-muted-foreground hover:text-red-600">Cancel</button>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mb-1.5">
                      {sent}/{total} sent
                      {r.failed_count ? ` · ${r.failed_count} failed` : ''}
                      {r.skipped_count ? ` · ${r.skipped_count} skipped` : ''}
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-blue-600 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    {sent > 0 && (
                      <div className="mt-2 flex items-center gap-4 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1" title="Recipients who opened the message. LinkedIn only reports a read receipt when the recipient has them switched on, so this is a minimum.">
                          <Eye className="h-3.5 w-3.5" />
                          <strong className="text-foreground font-medium">{seen}</strong> seen
                          <span className="text-muted-foreground/70">({rate(seen)}%)</span>
                        </span>
                        <span className="inline-flex items-center gap-1" title="Recipients who replied in the thread after this broadcast.">
                          <MessageSquare className="h-3.5 w-3.5" />
                          <strong className="text-foreground font-medium">{replied}</strong> replied
                          <span className="text-muted-foreground/70">({rate(replied)}%)</span>
                        </span>
                      </div>
                    )}
                    {r.error_message && <p className="mt-1 text-[11px] text-red-500">{r.error_message}</p>}
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
