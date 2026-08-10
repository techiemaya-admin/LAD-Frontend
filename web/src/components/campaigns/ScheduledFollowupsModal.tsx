'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/app-toaster';
import { proxyGet, proxyPost, proxyDelete } from '@/lib/api';
import TemplateSelector from '@/components/campaigns/linkedin-templates/TemplateSelector';
import type { LinkedInMessageTemplate } from '@lad/frontend-features/campaigns';
import {
  CalendarClock, Clock, Loader2, Plus, Trash2, Linkedin, Search,
  CheckCircle2, ChevronUp, CalendarPlus, FileText, Film, Music,
} from 'lucide-react';

interface SelectedMedia {
  url: string;
  type?: string | null;
  filename?: string | null;
}

type FollowupStatus = 'pending' | 'sent' | 'failed' | 'cancelled';

interface Followup {
  id: string;
  followupNumber: number;
  scheduledAt: string;
  status: FollowupStatus;
  parentStepId: string | null;
  cancelledReason: string | null;
  sentAt: string | null;
  createdAt: string;
}

interface AcceptedLead {
  campaignLeadId: string;
  leadId: string | null;
  acceptedAt: string | null;
  name: string;
  first_name: string;
  title: string;
  company: string;
  linkedin_url: string;
  photo_url: string | null;
  followups: Followup[];
  pendingCount: number;
  sentCount: number;
}

interface Props {
  campaignId: string;
  open: boolean;
  onClose: () => void;
}

const PRESETS: Array<{ label: string; hours: number }> = [
  { label: '+1 day', hours: 24 },
  { label: '+3 days', hours: 72 },
  { label: '+7 days', hours: 168 },
];

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

/** Human "in 3 days" / "2 hours ago" style hint for a scheduled time. */
function fmtRelative(iso: string | null): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return '';
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60000);
  const hrs = Math.round(abs / 3600000);
  const days = Math.round(abs / 86400000);
  const unit = days >= 1 ? `${days} day${days === 1 ? '' : 's'}`
    : hrs >= 1 ? `${hrs} hour${hrs === 1 ? '' : 's'}`
    : `${Math.max(1, mins)} min`;
  return ms >= 0 ? `in ${unit}` : `${unit} ago`;
}

/** Default value for a datetime-local input: now + 1 day, in local time. */
function defaultLocalDateTime(): string {
  const d = new Date(Date.now() + 24 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialOf(lead: AcceptedLead): string {
  return (lead.first_name?.[0] || lead.name?.[0] || '?').toUpperCase();
}

export default function ScheduledFollowupsModal({ campaignId, open, onClose }: Props) {
  const { push } = useToast();
  const [leads, setLeads] = useState<AcceptedLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  // Which lead's inline scheduler is open, plus its custom inputs.
  const [schedulerFor, setSchedulerFor] = useState<string | null>(null);
  const [customHours, setCustomHours] = useState('');
  const [customWhen, setCustomWhen] = useState('');
  // Optional predefined template + media applied to follow-ups scheduled here.
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia | null>(null);
  // Per-action loading keys: `sched:<leadId>` and `rm:<followupId>`.
  const [busy, setBusy] = useState<Set<string>>(new Set());
  // Synchronous double-submit guard. `busy` is React state (applies next render),
  // so rapid clicks in the same tick slip past the disabled button and fire
  // duplicate schedule POSTs. This ref blocks the 2nd+ call immediately. (The
  // backend also de-dupes; this stops the redundant requests at the source.)
  const inFlightRef = useRef<Set<string>>(new Set());

  const handleTemplateSelect = (tpl: LinkedInMessageTemplate | null) => {
    setSelectedTemplateId(tpl?.id ?? null);
    const meta = (tpl?.metadata ?? {}) as Record<string, any>;
    setSelectedMedia(tpl && meta.media_url
      ? { url: meta.media_url, type: meta.media_type ?? null, filename: meta.media_filename ?? null }
      : null);
  };

  const setBusyKey = (key: string, on: boolean) =>
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(key); else next.delete(key);
      return next;
    });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await proxyGet<{ success: boolean; leads: AcceptedLead[] }>(
        `/api/campaigns/${campaignId}/scheduled-followups`
      );
      setLeads(res.leads || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load scheduled follow-ups');
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    if (open) {
      load();
    } else {
      // Reset transient UI when closed.
      setSchedulerFor(null);
      setSearch('');
      setCustomHours('');
      setCustomWhen('');
      setSelectedTemplateId(null);
      setSelectedMedia(null);
    }
  }, [open, load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.title, l.company].some((v) => (v || '').toLowerCase().includes(q))
    );
  }, [leads, search]);

  const totalPending = useMemo(
    () => leads.reduce((sum, l) => sum + (l.pendingCount || 0), 0),
    [leads]
  );

  const openScheduler = (leadId: string) => {
    setSchedulerFor((cur) => (cur === leadId ? null : leadId));
    setCustomHours('');
    setCustomWhen(defaultLocalDateTime());
  };

  const schedule = useCallback(
    async (lead: AcceptedLead, body: { delayHours?: number; scheduledAt?: string }, label: string) => {
      const key = `sched:${lead.campaignLeadId}`;
      if (inFlightRef.current.has(key)) return; // synchronous guard: block a same-tick double-fire
      inFlightRef.current.add(key);
      setBusyKey(key, true);
      try {
        await proxyPost<{ success: boolean; id?: string; error?: string }>(
          `/api/campaigns/${campaignId}/leads/${lead.campaignLeadId}/scheduled-followups`,
          {
            ...body,
            // Carry the chosen predefined template + media so the cron sends that
            // template body + attachment at dispatch time.
            ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
            ...(selectedMedia ? { mediaUrl: selectedMedia.url, mediaType: selectedMedia.type || undefined } : {}),
          }
        );
        push({ variant: 'success', title: 'Follow-up scheduled', description: `${lead.name} · ${label}` });
        setSchedulerFor(null);
        await load();
      } catch (e: any) {
        push({ variant: 'error', title: 'Could not schedule', description: e?.message || 'Please try again' });
      } finally {
        inFlightRef.current.delete(key);
        setBusyKey(key, false);
      }
    },
    [campaignId, load, push, selectedTemplateId, selectedMedia]
  );

  const remove = useCallback(
    async (lead: AcceptedLead, followup: Followup) => {
      const key = `rm:${followup.id}`;
      setBusyKey(key, true);
      try {
        await proxyDelete<{ success: boolean; removed?: number; error?: string }>(
          `/api/campaigns/${campaignId}/leads/${lead.campaignLeadId}/scheduled-followups/${followup.id}`
        );
        push({ variant: 'success', title: 'Follow-up removed', description: `Scheduled ${fmtDateTime(followup.scheduledAt)}` });
        await load();
      } catch (e: any) {
        push({ variant: 'error', title: 'Could not remove', description: e?.message || 'Please try again' });
      } finally {
        setBusyKey(key, false);
      }
    },
    [campaignId, load, push]
  );

  const submitCustomHours = (lead: AcceptedLead) => {
    const h = parseInt(customHours, 10);
    if (!Number.isFinite(h) || h <= 0) {
      push({ variant: 'warning', title: 'Enter hours', description: 'Enter a positive number of hours.' });
      return;
    }
    schedule(lead, { delayHours: h }, `in ${h} hour${h === 1 ? '' : 's'}`);
  };

  const submitCustomWhen = (lead: AcceptedLead) => {
    if (!customWhen) {
      push({ variant: 'warning', title: 'Pick a time', description: 'Choose a date and time.' });
      return;
    }
    const when = new Date(customWhen);
    if (Number.isNaN(when.getTime()) || when.getTime() < Date.now()) {
      push({ variant: 'warning', title: 'Pick a future time', description: 'The time must be in the future.' });
      return;
    }
    schedule(lead, { scheduledAt: when.toISOString() }, fmtDateTime(when.toISOString()));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0b1957]/10 flex items-center justify-center shrink-0">
              <CalendarClock className="w-5 h-5 text-[#0b1957] dark:text-indigo-300" />
            </div>
            <div>
              <DialogTitle>Scheduled Follow-ups</DialogTitle>
              <DialogDescription>
                Connection-accepted leads — schedule or remove upcoming LinkedIn follow-ups.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Search + summary */}
        <div className="flex items-center gap-3 px-4 sm:px-8 py-3 border-b border-gray-100 dark:border-blue-950/40 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search accepted leads…"
              className="pl-9 h-9 rounded-xl"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500 dark:text-[#7a8ba3] whitespace-nowrap">
            {leads.length} lead{leads.length === 1 ? '' : 's'} · {totalPending} scheduled
          </span>
        </div>

        {/* Optional template + media applied to follow-ups scheduled below */}
        <div className="px-4 sm:px-8 py-3 border-b border-gray-100 dark:border-blue-950/40 shrink-0 space-y-2">
          <TemplateSelector
            selectedTemplateId={selectedTemplateId || undefined}
            onTemplateSelect={handleTemplateSelect}
            onManageClick={() => window.open('/conversations/templates', '_blank')}
          />
          {selectedMedia && (
            <div className="flex items-center gap-2 p-2 rounded-md border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#1a2a43]">
              {selectedMedia.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={selectedMedia.url} alt={selectedMedia.filename || 'attachment'} className="h-10 w-10 rounded object-cover border" />
              ) : (
                <div className="h-10 w-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500">
                  {selectedMedia.type === 'video' ? <Film className="h-4 w-4" />
                    : selectedMedia.type === 'audio' ? <Music className="h-4 w-4" />
                    : <FileText className="h-4 w-4" />}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-slate-700 dark:text-slate-200 truncate">{selectedMedia.filename || 'Attachment'}</p>
                <p className="text-[10px] text-slate-500 capitalize">{selectedMedia.type || 'file'} · attached to scheduled follow-ups</p>
              </div>
            </div>
          )}
          <p className="text-[11px] text-slate-400 dark:text-[#7a8ba3]">
            Optional — pick a saved template to send its message{selectedMedia ? ' + attachment' : ''} instead of an AI-generated follow-up.
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-sm">Loading scheduled follow-ups…</span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-sm text-rose-500 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={load}>Retry</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
              <CalendarClock className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm font-medium">
                {leads.length === 0 ? 'No connection-accepted leads yet' : 'No leads match your search'}
              </p>
              {leads.length === 0 && (
                <p className="text-xs mt-1">Once a lead accepts the connection, they’ll appear here.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((lead) => {
                const pending = lead.followups.filter((f) => f.status === 'pending');
                const sent = lead.followups.filter((f) => f.status === 'sent');
                const isSchedOpen = schedulerFor === lead.campaignLeadId;
                const schedBusy = busy.has(`sched:${lead.campaignLeadId}`);
                return (
                  <div
                    key={lead.campaignLeadId}
                    className="rounded-2xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#1a2a43] overflow-hidden"
                  >
                    {/* Lead header row */}
                    <div className="flex items-center gap-3 px-4 py-3">
                      {lead.photo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={lead.photo_url} alt={lead.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-[#0b1957]/10 dark:bg-indigo-500/20 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-[#0b1957] dark:text-indigo-200">{initialOf(lead)}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{lead.name}</p>
                          {lead.linkedin_url && (
                            <a
                              href={lead.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0A66C2] hover:opacity-80 shrink-0"
                              title="Open LinkedIn profile"
                            >
                              <Linkedin className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 dark:text-[#7a8ba3] truncate">
                          {[lead.title, lead.company].filter(Boolean).join(' · ') || 'LinkedIn lead'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={
                            'text-xs px-2.5 py-1 rounded-full font-semibold ' +
                            (pending.length > 0
                              ? 'bg-[#0b1957]/10 text-[#0b1957] dark:bg-indigo-500/20 dark:text-indigo-200'
                              : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500')
                          }
                        >
                          {pending.length} scheduled
                        </span>
                        <Button
                          size="sm"
                          onClick={() => openScheduler(lead.campaignLeadId)}
                          className="h-8 rounded-xl bg-[#0b1957] hover:bg-[#0b1957]/90 text-white text-xs font-semibold gap-1"
                        >
                          {isSchedOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                          Schedule
                        </Button>
                      </div>
                    </div>

                    {/* Inline scheduler */}
                    {isSchedOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-blue-950/40 bg-slate-50/60 dark:bg-[#16233a]">
                        <p className="text-xs font-semibold text-slate-500 dark:text-[#7a8ba3] mt-3 mb-2">
                          Quick schedule
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {PRESETS.map((p) => (
                            <button
                              key={p.hours}
                              disabled={schedBusy}
                              onClick={() => schedule(lead, { delayHours: p.hours }, p.label)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-[#2c3d57] bg-white dark:bg-[#1a2a43] text-slate-700 dark:text-slate-200 hover:border-[#0b1957]/50 hover:text-[#0b1957] disabled:opacity-50 transition-colors"
                            >
                              {p.label}
                            </button>
                          ))}
                          {schedBusy && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                          {/* Custom hours */}
                          <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-[#7a8ba3] mb-1 block">
                              In N hours
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                min={1}
                                value={customHours}
                                onChange={(e) => setCustomHours(e.target.value)}
                                placeholder="e.g. 12"
                                className="h-9 rounded-xl"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={schedBusy}
                                onClick={() => submitCustomHours(lead)}
                                className="h-9 rounded-xl gap-1 shrink-0"
                              >
                                <Clock className="w-3.5 h-3.5" /> Add
                              </Button>
                            </div>
                          </div>

                          {/* Exact date/time */}
                          <div>
                            <label className="text-xs font-semibold text-slate-500 dark:text-[#7a8ba3] mb-1 block">
                              At a specific time
                            </label>
                            <div className="flex items-center gap-2">
                              <Input
                                type="datetime-local"
                                value={customWhen}
                                onChange={(e) => setCustomWhen(e.target.value)}
                                className="h-9 rounded-xl"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={schedBusy}
                                onClick={() => submitCustomWhen(lead)}
                                className="h-9 rounded-xl gap-1 shrink-0"
                              >
                                <CalendarPlus className="w-3.5 h-3.5" /> Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Scheduled + sent list */}
                    {(pending.length > 0 || sent.length > 0) && (
                      <div className="px-4 pb-3 pt-1 border-t border-slate-100 dark:border-blue-950/40">
                        {pending.map((f) => {
                          const rmBusy = busy.has(`rm:${f.id}`);
                          return (
                            <div key={f.id} className="flex items-center gap-2 py-1.5">
                              <CalendarClock className="w-4 h-4 text-[#0b1957] dark:text-indigo-300 shrink-0" />
                              <span className="text-sm text-slate-700 dark:text-slate-200">
                                {fmtDateTime(f.scheduledAt)}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-[#7a8ba3]">
                                {fmtRelative(f.scheduledAt)}
                              </span>
                              <div className="flex-1" />
                              <button
                                disabled={rmBusy}
                                onClick={() => remove(lead, f)}
                                title="Remove scheduled follow-up"
                                className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 transition-colors"
                              >
                                {rmBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              </button>
                            </div>
                          );
                        })}
                        {sent.map((f) => (
                          <div key={f.id} className="flex items-center gap-2 py-1.5 opacity-70">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              Sent {fmtDateTime(f.sentAt || f.scheduledAt)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
