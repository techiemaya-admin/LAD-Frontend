'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, Repeat, Linkedin, Mail, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

/**
 * Creates a RECURRING campaign whose lead source is Zoho CRM: each day the
 * campaign engine imports newly-created Zoho contacts/leads and runs them
 * through the chosen LinkedIn→Email sequence (backend source='zoho_contacts').
 */
export const RecurringZohoCampaignModal: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [name, setName] = useState('');
  const [modules, setModules] = useState<'contacts' | 'contacts_leads'>('contacts');
  const [tag, setTag] = useState('');
  const [perDay, setPerDay] = useState('25');
  const [days, setDays] = useState('30');

  const [liEnabled, setLiEnabled] = useState(true);
  const [liMessage, setLiMessage] = useState('');
  const [waitAccept, setWaitAccept] = useState(true);

  const [emailEnabled, setEmailEnabled] = useState(true);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailDelayDays, setEmailDelayDays] = useState('1');

  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(true);
  /** The server could not determine the connection state — not the same as "off". */
  const [statusUnavailable, setStatusUnavailable] = useState(false);

  // Keyboard users have no other way to dismiss this modal: the overlay
  // click-to-close only reaches mouse users, and nothing was listening for
  // Escape.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  // Without Zoho connected there's nothing to import — the campaign would
  // create real, scheduled DB rows via /api/campaigns and then sit forever
  // importing zero contacts, with nothing telling the user why.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetchWithTenant('/api/social-integration/zoho/status')
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setConnected(!!d?.data?.connected);
        setStatusUnavailable(!!d?.data?.status_unavailable);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const buildSteps = () => {
    let order = 0;
    const steps: any[] = [
      {
        type: 'lead_generation', title: 'Import from Zoho CRM', channel: 'linkedin', order_index: order++,
        config: {
          source: 'zoho_contacts',
          zoho_modules: modules,
          zoho_tag: tag.trim() || undefined,
          leadGenerationLimit: Math.max(1, parseInt(perDay, 10) || 25),
        },
      },
    ];
    if (liEnabled) {
      steps.push({
        type: 'linkedin_connect', title: 'Send Connection Request', channel: 'linkedin', order_index: order++,
        config: { message: liMessage.trim(), delayDays: 0, delayHours: 0 },
      });
      if (waitAccept && emailEnabled) {
        steps.push({
          type: 'wait_for_condition', title: 'Wait for Connection Accepted', channel: 'linkedin', order_index: order++,
          config: { condition: 'connection_accepted', action_type: 'CONNECTION_ACCEPTED' },
        });
      }
    }
    if (emailEnabled) {
      steps.push({
        type: 'email_send', title: 'Send Email', channel: 'email', order_index: order++,
        config: { subject: emailSubject.trim(), body: emailBody.trim(), delayDays: Math.max(0, parseInt(emailDelayDays, 10) || 0), delayHours: 0 },
      });
    }
    return steps;
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('Give the campaign a name.'); return; }
    if (!liEnabled && !emailEnabled) { setError('Enable at least one channel (LinkedIn or Email).'); return; }
    setCreating(true); setError(null);

    const perDayN = Math.max(1, parseInt(perDay, 10) || 25);
    const daysN = Math.max(1, parseInt(days, 10) || 30);
    const start = new Date();
    const end = new Date(); end.setDate(end.getDate() + daysN);

    const payload = {
      name: name.trim(),
      status: 'active',
      leads_per_day: perDayN,
      campaign_start_date: start.toISOString(),
      campaign_end_date: end.toISOString(),
      config: {
        data_source: 'zoho_contacts',
        enrollment_source: 'zoho_contacts',
        leads_per_day: perDayN,
        campaign_days: daysN,
        working_days: 'monday-friday',
        zoho_modules: modules,
        zoho_tag: tag.trim() || undefined,
      },
      steps: buildSteps(),
    };

    try {
      const res = await fetchWithTenant('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && (data?.success || data?.id || data?.data?.id)) {
        window.location.href = '/campaigns';
      } else {
        setError(data?.error || 'Failed to create campaign');
        setCreating(false);
      }
    } catch {
      setError('Failed to create campaign');
      setCreating(false);
    }
  };

  const field = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-card rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-zoho-campaign-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            <div>
              <div id="recurring-zoho-campaign-title" className="text-sm font-semibold text-foreground">Recurring Zoho campaign</div>
              <p className="text-xs text-muted-foreground">Imports new Zoho contacts daily and runs them through your sequence.</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {!connected && statusUnavailable && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              Couldn&apos;t check your Zoho connection, so creating is paused. This isn&apos;t
              &quot;not connected&quot; — close and reopen this dialog to try again.
            </div>
          )}
          {!connected && !statusUnavailable && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              Zoho CRM isn&apos;t connected. Connect it in Settings → Integrations first — this campaign
              would otherwise import zero contacts.
            </div>
          )}
          {error && <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground">Campaign name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Zoho new-contacts outreach" />
          </div>

          {/* Source */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="text-sm font-medium text-foreground">Zoho source</div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Import from</label>
              <select value={modules} onChange={(e) => setModules(e.target.value as any)} className={field}>
                <option value="contacts">Contacts only</option>
                <option value="contacts_leads">Contacts + Leads</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Only contacts with tag (optional)</label>
              <Input value={tag} onChange={(e) => setTag(e.target.value)} placeholder="e.g. Auto-Conversion Lead. Leave blank for all new." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">New contacts / day</label>
                <Input type="number" value={perDay} onChange={(e) => setPerDay(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Run for (days)</label>
                <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
              </div>
            </div>
          </div>

          {/* Sequence */}
          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="text-sm font-medium text-foreground">Sequence</div>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={liEnabled} onChange={(e) => setLiEnabled(e.target.checked)} className="h-4 w-4" />
              <Linkedin className="h-4 w-4 text-blue-700" /> Send LinkedIn connection request
            </label>
            {liEnabled && (
              <textarea className={`${field} min-h-[60px]`} value={liMessage} onChange={(e) => setLiMessage(e.target.value)}
                placeholder="Connection note (optional). Leave blank to let Mr LAD draft it." />
            )}

            {liEnabled && emailEnabled && (
              <label className="flex items-center gap-2 text-sm text-foreground">
                <input type="checkbox" checked={waitAccept} onChange={(e) => setWaitAccept(e.target.checked)} className="h-4 w-4" />
                <Clock className="h-4 w-4 text-muted-foreground" /> Wait for connection accepted before emailing
              </label>
            )}

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" checked={emailEnabled} onChange={(e) => setEmailEnabled(e.target.checked)} className="h-4 w-4" />
              <Mail className="h-4 w-4 text-slate-600" /> Send email
            </label>
            {emailEnabled && (
              <div className="space-y-2">
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Email subject" />
                <textarea className={`${field} min-h-[80px]`} value={emailBody} onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Email body. Leave blank to let Mr LAD draft it." />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">Delay before email (days)</label>
                  <Input type="number" className="w-20" value={emailDelayDays} onChange={(e) => setEmailDelayDays(e.target.value)} />
                </div>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            Each day the campaign imports new Zoho {modules === 'contacts_leads' ? 'contacts & leads' : 'contacts'}{tag.trim() ? ` tagged “${tag.trim()}”` : ''} (deduped) and runs the sequence. LinkedIn profiles are resolved from name + company when the contact has no URL. Sends pass the usual supervise + credit checks.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} disabled={creating}>Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={creating || !connected}
            title={
              connected
                ? undefined
                : statusUnavailable
                  ? "Couldn't check your Zoho connection — try again shortly"
                  : 'Connect Zoho CRM first'
            }
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Repeat className="h-4 w-4 mr-2" />}
            Create recurring campaign
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RecurringZohoCampaignModal;
