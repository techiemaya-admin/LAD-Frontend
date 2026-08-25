'use client';

import { useEffect, useState, useMemo } from 'react';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface TemplateOpt {
  name: string;
  language: string;
  parameters: string[];
}

interface ScheduleBroadcastModalProps {
  open: boolean;
  onClose: () => void;
  groupIds: string[];
  channel: 'personal' | 'waba';
  onScheduled?: () => void;
}

/**
 * Schedule a group broadcast for a future time (Cloud-Task triggered).
 * Two modes: a free-text Message (→ broadcast-to-groups) or a Template
 * (→ schedule-template-broadcast). Both carry a `scheduled_at` ISO timestamp.
 */
export function ScheduleBroadcastModal({ open, onClose, groupIds, channel, onScheduled }: ScheduleBroadcastModalProps) {
  const [mode, setMode] = useState<'message' | 'template'>('message');
  const [message, setMessage] = useState('');
  const [templates, setTemplates] = useState<TemplateOpt[]>([]);
  const [templateName, setTemplateName] = useState('');
  const [params, setParams] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Recurrence (template mode only). 'once' = one-shot at scheduledAt.
  const [repeat, setRepeat] = useState<'once' | 'daily' | 'weekly' | 'monthly'>('once');
  const [recurDay, setRecurDay] = useState<number>(0);   // weekly: 0-6 (Sun=0) | monthly: 1-31
  const [recurTime, setRecurTime] = useState<string>('09:00');

  useEffect(() => {
    if (!open) {
      setMode('message'); setMessage(''); setTemplateName(''); setParams([]);
      setScheduledAt(''); setError(null); setSubmitting(false);
      setRepeat('once'); setRecurDay(0); setRecurTime('09:00');
    }
  }, [open]);

  // Lazy-load templates the first time the user switches to template mode.
  useEffect(() => {
    if (!open || mode !== 'template' || templates.length) return;
    setLoadingTemplates(true);
    fetchWithTenant(`/api/whatsapp-conversations/conversations/templates?channel=${channel}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data?.success) return;
        const raw: any[] = data.data || data.templates || [];
        setTemplates(
          raw
            .filter((t: any) => t.status !== 'REJECTED' && t.status !== 'DELETED')
            .map((t: any) => {
              const body = t.body || t.content || '';
              const bodyParams = [...new Set(
                (body.match(/\{\{([^}]+)\}\}/g) || []).map((p: string) => p.replace(/^\{\{|\}\}$/g, '').trim())
              )] as string[];
              return {
                name: t.name || '',
                language: t.language || t.language_code || 'en',
                parameters: (t.parameters && t.parameters.length ? t.parameters : bodyParams) as string[],
              };
            })
        );
      })
      .catch(() => {})
      .finally(() => setLoadingTemplates(false));
  }, [open, mode, channel, templates.length]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.name === templateName),
    [templates, templateName]
  );

  // datetime-local min: ~2 minutes from now, in the browser's local time.
  const minDateTime = useMemo(() => {
    const d = new Date(Date.now() + 2 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }, [open]);

  const submit = async () => {
    setError(null);
    if (mode === 'message' && !message.trim()) { setError('Enter a message'); return; }
    if (mode === 'template' && !templateName) { setError('Pick a template'); return; }

    // Recurring (template only) sends the rule + tenant-local timezone; one-shot sends scheduled_at.
    const recurring = mode === 'template' && repeat !== 'once';
    let timing: Record<string, unknown>;
    if (recurring) {
      if (!recurTime) { setError('Pick a time'); return; }
      timing = {
        recurrence: repeat,
        recurrence_day: repeat === 'daily' ? null : recurDay,
        recurrence_time: recurTime,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    } else {
      if (!scheduledAt) { setError('Pick a date and time'); return; }
      const whenIso = new Date(scheduledAt).toISOString();
      if (new Date(whenIso).getTime() <= Date.now() + 30 * 1000) { setError('Pick a time at least a minute from now'); return; }
      timing = { scheduled_at: whenIso };
    }

    setSubmitting(true);
    try {
      const res = mode === 'message'
        ? await fetchWithTenant(`/api/whatsapp-conversations/chat-groups/broadcast-to-groups?channel=${channel}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ group_ids: groupIds, message: message.trim(), ...timing }),
          })
        : await fetchWithTenant(`/api/whatsapp-conversations/chat-groups/schedule-template-broadcast?channel=${channel}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              group_ids: groupIds,
              template_name: templateName,
              language_code: selectedTemplate?.language || 'en',
              parameters: params,
              ...timing,
            }),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.scheduled === false) {
        throw new Error(data?.error || `Failed to schedule (HTTP ${res.status})`);
      }
      onScheduled?.();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule broadcast');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-emerald-600" />
            Schedule broadcast · {groupIds.length} group{groupIds.length === 1 ? '' : 's'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="flex gap-2">
            {(['message', 'template'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); if (m === 'message') setRepeat('once'); }}
                className={`flex-1 text-sm py-1.5 rounded-md border transition-colors ${
                  mode === m ? 'bg-emerald-500 text-white border-emerald-500' : 'border-border hover:bg-muted'
                }`}
              >
                {m === 'message' ? 'Message' : 'Template'}
              </button>
            ))}
          </div>

          {mode === 'message' ? (
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Type the message to post into each group…"
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
          ) : (
            <div className="space-y-2">
              {loadingTemplates ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading templates…
                </div>
              ) : (
                <select
                  value={templateName}
                  onChange={(e) => { setTemplateName(e.target.value); setParams([]); }}
                  className="w-full text-sm rounded-md border border-border bg-background px-3 py-2"
                >
                  <option value="">Select a template…</option>
                  {templates.map((t) => (
                    <option key={t.name} value={t.name}>{t.name} ({t.language})</option>
                  ))}
                </select>
              )}
              {selectedTemplate && selectedTemplate.parameters.length > 0 && (
                <div className="space-y-1.5">
                  {selectedTemplate.parameters.map((p, i) => (
                    <input
                      key={i}
                      value={params[i] || ''}
                      onChange={(e) => setParams((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                      placeholder={`Value for {{${p}}}`}
                      className="w-full text-sm rounded-md border border-border bg-background px-3 py-1.5"
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Repeat - template mode only (recurrence requires a template) */}
          {mode === 'template' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Repeat</label>
              <select
                value={repeat}
                onChange={(e) => {
                  const v = e.target.value as 'once' | 'daily' | 'weekly' | 'monthly';
                  setRepeat(v);
                  if (v === 'monthly' && (recurDay < 1 || recurDay > 31)) setRecurDay(1);
                  if (v === 'weekly' && (recurDay < 0 || recurDay > 6)) setRecurDay(0);
                }}
                className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-2"
              >
                <option value="once">Don&apos;t repeat (one time)</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          )}

          {mode === 'template' && repeat !== 'once' ? (
            <>
              <div className="flex gap-2">
                {repeat === 'weekly' && (
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">On</label>
                    <select
                      value={recurDay}
                      onChange={(e) => setRecurDay(Number(e.target.value))}
                      className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-2"
                    >
                      {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d, i) => (
                        <option key={i} value={i}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
                {repeat === 'monthly' && (
                  <div className="flex-1">
                    <label className="text-xs font-medium text-muted-foreground">Day of month</label>
                    <select
                      value={recurDay}
                      onChange={(e) => setRecurDay(Number(e.target.value))}
                      className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-2"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground">At</label>
                  <input
                    type="time"
                    value={recurTime}
                    onChange={(e) => setRecurTime(e.target.value)}
                    className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-2"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Repeats {repeat === 'daily'
                  ? 'every day'
                  : repeat === 'weekly'
                    ? `every ${['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][recurDay] || 'Sun'}`
                    : `on day ${recurDay} of each month`} at {recurTime}. Runs until you cancel it.
              </p>
            </>
          ) : (
            <div>
              <label className="text-xs font-medium text-muted-foreground">Send at</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={minDateTime}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1 w-full text-sm rounded-md border border-border bg-background px-3 py-2"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="text-sm px-4 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium disabled:opacity-60 flex items-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Schedule
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
