'use client';

import { useState, useEffect, useCallback, memo } from 'react';
import {
  Mail, Plus, Send, Loader2, X, Check, AlertCircle,
  FileText, Trash2, ChevronLeft, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { safeStorage } from '@lad/shared/storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

// ── Types ────────────────────────────────────────────────────────────────────

// Shape returned by /api/campaigns/email-templates (emailTemplateDto.toApiDto)
interface EmailTemplate {
  id: string;
  name: string;
  subject: string;         // stored in metadata.subject, mapped by DTO
  body: string;            // plain-text fallback (content column)
  body_html: string | null;// HTML body (content_html column)
  category: string;
  is_active: boolean;
  created_at: string;
}

interface EmailContact {
  id: string;
  contact_name: string | null;
  email: string | null;
  company: string | null;
}

interface EmailGroupDetail {
  id: string;
  name: string;
  color: string;
  member_count: number;
  members: EmailContact[];
}

type EmailProvider = 'gmail' | 'outlook';

interface EmailTemplatePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  group: EmailGroupDetail;
  provider: EmailProvider;
}

// ── Constants ────────────────────────────────────────────────────────────────

// Templates live in communication_templates (core DB), served by the Node.js backend
const TEMPLATES_API = '/api/campaigns/email-templates';
// Groups/contacts/send live in the Python WABA service
const EMAIL_API = '/api/email-conversations';

const PERSONALIZATION_VARS = [
  { label: '{name}', desc: 'Full name' },
  { label: '{first_name}', desc: 'First name only' },
  { label: '{email}', desc: 'Email address' },
  { label: '{company}', desc: 'Company name' },
];

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = safeStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('selectedTenantId') : null;
  if (tenant && tenant !== 'default') headers['X-Tenant-ID'] = tenant;
  return headers;
}

// ── Send Result ───────────────────────────────────────────────────────────────

interface SendResult {
  sent: number;
  failed: number;
  total: number;
  errors: { email: string; error: string }[];
}

// ── Main Component ────────────────────────────────────────────────────────────

export const EmailTemplatePicker = memo(function EmailTemplatePicker({
  open, onOpenChange, group, provider,
}: EmailTemplatePickerProps) {
  // View: 'list' | 'compose' | 'preview' | 'sending' | 'done'
  const [view, setView]               = useState<'list' | 'compose' | 'preview' | 'sending' | 'done'>('list');
  const [templates, setTemplates]     = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selected, setSelected]       = useState<EmailTemplate | null>(null);

  // Compose form
  const [formName, setFormName]       = useState('');
  const [formSubject, setFormSubject] = useState('');
  const [formBody, setFormBody]       = useState('');
  const [formError, setFormError]     = useState('');
  const [saving, setSaving]           = useState(false);

  // Preview / send
  const [sendSubject, setSendSubject] = useState('');
  const [sendBody, setSendBody]       = useState('');
  const [sendError, setSendError]     = useState('');
  const [sending, setSending]         = useState(false);
  const [sendResult, setSendResult]   = useState<SendResult | null>(null);

  // Delete
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  // ── Load templates ──────────────────────────────────────────────────────────

  const loadTemplates = useCallback(async () => {
    setLoadingTemplates(true);
    try {
      // communication_templates uses channel='email' for all email templates;
      // filter by gmail/outlook via category or just load all email ones
      const res = await fetch(`${TEMPLATES_API}?isActive=true`, { headers: authHeaders() });
      const data = await res.json();
      // Backend returns { templates: [...] } or { data: [...] } depending on version
      const list: EmailTemplate[] = data.templates ?? data.data ?? [];
      setTemplates(list);
    } finally {
      setLoadingTemplates(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadTemplates();
      setView('list');
      setSelected(null);
      setSendResult(null);
      setFormName(''); setFormSubject(''); setFormBody(''); setFormError('');
    }
  }, [open, loadTemplates]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectTemplate = useCallback((tpl: EmailTemplate) => {
    setSelected(tpl);
    setSendSubject(tpl.subject);
    setSendBody(tpl.body_html ?? tpl.body ?? '');
    setSendError('');
    setView('preview');
  }, []);

  const handleSaveTemplate = useCallback(async () => {
    const name = formName.trim();
    const subject = formSubject.trim();
    const body = formBody.trim();
    if (!name || !subject || !body) {
      setFormError('Name, subject and body are all required.');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      // POST to communication_templates via /api/campaigns/email-templates
      // category='email_send' is required; channel is always 'email' in that table
      const res = await fetch(TEMPLATES_API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, subject, body_html: body, category: 'email_send' }),
      });
      const data = await res.json();
      // Response shape: { id, name, subject, body_html, ... } from emailTemplateDto.toApiDto
      const saved: EmailTemplate = data.id ? data : data.data ?? data.template;
      if (saved?.id) {
        setTemplates(prev => [saved, ...prev]);
        setSelected(saved);
        setSendSubject(saved.subject);
        setSendBody(saved.body_html ?? saved.body ?? '');
        setSendError('');
        setView('preview');
      } else {
        setFormError(data.error || data.message || 'Failed to save template.');
      }
    } catch (err) {
      setFormError(String(err));
    } finally {
      setSaving(false);
    }
  }, [formName, formSubject, formBody]);

  const handleDeleteTemplate = useCallback(async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await fetch(`${TEMPLATES_API}/${id}`, { method: 'DELETE', headers: authHeaders() });
      setTemplates(prev => prev.filter(t => t.id !== id));
      if (selected?.id === id) { setSelected(null); setView('list'); }
    } finally {
      setDeletingId(null);
    }
  }, [selected]);

  const handleSend = useCallback(async () => {
    const subject = sendSubject.trim();
    const body = sendBody.trim();
    if (!subject || !body) {
      setSendError('Subject and body are required.');
      return;
    }
    setSending(true);
    setSendError('');
    setView('sending');

    try {
      const recipients = group.members
        .filter(m => m.email)
        .map(m => ({
          email: m.email!,
          name: m.contact_name || '',
          company: m.company || '',
        }));

      if (recipients.length === 0) {
        setSendError('No recipients with email addresses in this group.');
        setView('preview');
        setSending(false);
        return;
      }

      // Backend expects 'google' | 'microsoft' (not 'gmail' | 'outlook')
      const backendProvider = provider === 'outlook' ? 'microsoft' : 'google';
      const res = await fetch(`${EMAIL_API}/send-bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ provider: backendProvider, recipients, subject, body_html: body }),
      });
      const data = await res.json();

      if (data.success) {
        setSendResult({
          sent: data.sent ?? 0,
          failed: data.failed ?? 0,
          total: data.total ?? recipients.length,
          errors: data.errors || [],
        });
        setView('done');
      } else {
        setSendError(data.error || data.detail || 'Send failed — please try again.');
        setView('preview');
      }
    } catch (err) {
      setSendError(String(err));
      setView('preview');
    } finally {
      setSending(false);
    }
  }, [sendSubject, sendBody, group.members, provider]);

  const insertVar = useCallback((varLabel: string, field: 'subject' | 'body') => {
    if (field === 'subject') setSendSubject(prev => prev + varLabel);
    else setSendBody(prev => prev + varLabel);
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────────

  const providerLabel = provider === 'gmail' ? 'Gmail' : 'Outlook';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 pb-3 border-b border-border flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold">
            {(view === 'compose' || view === 'preview') && (
              <button
                onClick={() => {
                  if (view === 'preview') { setView('list'); setSelected(null); }
                  else setView('list');
                }}
                className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors mr-1"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div
              className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: group.color }}
            >
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <span className="truncate">
                {view === 'list' && `Send Email to "${group.name}"`}
                {view === 'compose' && 'New Template'}
                {view === 'preview' && (selected?.name || 'Preview & Send')}
                {view === 'sending' && 'Sending…'}
                {view === 'done' && 'Sent!'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-normal flex-shrink-0">
              {group.member_count} recipient{group.member_count !== 1 ? 's' : ''} via {providerLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── List view ─────────────────────────────────────────── */}
          {view === 'list' && (
            <div className="p-4 space-y-3">
              {/* Create new button */}
              <button
                onClick={() => {
                  setFormName(''); setFormSubject(''); setFormBody(''); setFormError('');
                  setView('compose');
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 text-primary transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">Create New Template</p>
                  <p className="text-xs text-muted-foreground">Write a new email template</p>
                </div>
              </button>

              {/* Template list */}
              {loadingTemplates ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No templates yet</p>
                  <p className="text-xs mt-1">Create your first email template above</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                    Saved Templates
                  </p>
                  {templates.map(tpl => (
                    // div+role instead of <button> so the delete <button> inside is valid HTML
                    <div
                      key={tpl.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectTemplate(tpl)}
                      onKeyDown={e => e.key === 'Enter' && handleSelectTemplate(tpl)}
                      className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-colors text-left group cursor-pointer"
                    >
                      <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                        <Mail className="h-4 w-4 text-blue-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{tpl.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{tpl.subject}</p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                        disabled={deletingId === tpl.id}
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 transition-all flex-shrink-0"
                      >
                        {deletingId === tpl.id
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Compose view ──────────────────────────────────────── */}
          {view === 'compose' && (
            <div className="p-4 space-y-3">
              {/* Template name */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Template Name</label>
                <Input
                  placeholder="e.g. Follow-up, Welcome, Promo"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="h-9 text-sm"
                  autoFocus
                />
              </div>

              {/* Subject */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</label>
                <Input
                  placeholder="Email subject..."
                  value={formSubject}
                  onChange={e => setFormSubject(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Body */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email Body</label>
                <textarea
                  placeholder={`Hi {name},\n\nWrite your email here...\n\nBest regards`}
                  value={formBody}
                  onChange={e => setFormBody(e.target.value)}
                  className="w-full h-40 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
              </div>

              {/* Personalization hints */}
              <PersonalizationHints onInsert={(v) => setFormBody(prev => prev + v)} />

              {/* Error */}
              {formError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {formError}
                </div>
              )}
            </div>
          )}

          {/* ── Preview / edit view ───────────────────────────────── */}
          {view === 'preview' && (
            <div className="p-4 space-y-3">
              {/* Subject editor */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Subject</label>
                <Input
                  placeholder="Email subject..."
                  value={sendSubject}
                  onChange={e => setSendSubject(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              {/* Body editor */}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Body</label>
                <textarea
                  placeholder="Email body..."
                  value={sendBody}
                  onChange={e => setSendBody(e.target.value)}
                  className="w-full h-48 px-3 py-2 rounded-md border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono"
                />
              </div>

              {/* Personalization hints */}
              <PersonalizationHints onInsert={(v) => setSendBody(prev => prev + v)} />

              {/* Recipients preview */}
              <div className="rounded-lg border border-border bg-muted/30 p-3">
                <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                  Sending to {group.member_count} recipient{group.member_count !== 1 ? 's' : ''} in "{group.name}"
                </p>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                  {group.members.slice(0, 10).map(m => (
                    <span key={m.id} className="text-xs bg-background border border-border rounded px-1.5 py-0.5 truncate max-w-[160px]">
                      {m.contact_name || m.email}
                    </span>
                  ))}
                  {group.members.length > 10 && (
                    <span className="text-xs text-muted-foreground px-1">
                      +{group.members.length - 10} more
                    </span>
                  )}
                </div>
              </div>

              {/* Error */}
              {sendError && (
                <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {sendError}
                </div>
              )}
            </div>
          )}

          {/* ── Sending view ──────────────────────────────────────── */}
          {view === 'sending' && (
            <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
              <div>
                <p className="font-semibold">Sending emails…</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Sending to {group.member_count} recipient{group.member_count !== 1 ? 's' : ''} via {providerLabel}
                </p>
              </div>
            </div>
          )}

          {/* ── Done view ─────────────────────────────────────────── */}
          {view === 'done' && sendResult && (
            <div className="flex flex-col items-center justify-center py-10 px-6 text-center gap-4">
              <div className="h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-7 w-7 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-lg">Emails Sent!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Campaign dispatched via {providerLabel}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-2xl font-bold text-green-700">{sendResult.sent}</p>
                  <p className="text-xs text-green-600 mt-0.5">Sent</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <p className="text-2xl font-bold text-red-700">{sendResult.failed}</p>
                  <p className="text-xs text-red-600 mt-0.5">Failed</p>
                </div>
              </div>
              {sendResult.errors.length > 0 && (
                <details className="text-xs text-left w-full max-w-xs">
                  <summary className="cursor-pointer text-red-500 font-medium">
                    {sendResult.errors.length} failed recipients
                  </summary>
                  <ul className="mt-2 space-y-1 max-h-24 overflow-y-auto">
                    {sendResult.errors.map((err, i) => (
                      <li key={i} className="text-muted-foreground">
                        <span className="text-red-400">·</span> {err.email} — {err.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex-shrink-0">
          {view === 'list' && (
            <Button variant="ghost" size="sm" className="w-full" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          )}

          {view === 'compose' && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" className="flex-1" onClick={() => setView('list')}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleSaveTemplate}
                disabled={saving || !formName.trim() || !formSubject.trim() || !formBody.trim()}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                Save & Preview
              </Button>
            </div>
          )}

          {view === 'preview' && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setView('list'); setSelected(null); }}>
                Back
              </Button>
              <Button
                size="sm"
                className="flex-1 gap-1.5"
                onClick={handleSend}
                disabled={sending || !sendSubject.trim() || !sendBody.trim()}
              >
                <Send className="h-3.5 w-3.5" />
                Send to {group.member_count} Recipient{group.member_count !== 1 ? 's' : ''}
              </Button>
            </div>
          )}

          {view === 'sending' && (
            <Button variant="ghost" size="sm" className="w-full" disabled>
              <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
              Sending…
            </Button>
          )}

          {view === 'done' && (
            <Button size="sm" className="w-full gap-1.5" onClick={() => onOpenChange(false)}>
              <Check className="h-3.5 w-3.5" />
              Done
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

// ── Personalization Hints ────────────────────────────────────────────────────

function PersonalizationHints({ onInsert }: { onInsert: (v: string) => void }) {
  return (
    <div className="rounded-lg bg-muted/40 border border-border p-3 space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        <p className="text-xs font-medium">Personalisation variables</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {PERSONALIZATION_VARS.map(({ label, desc }) => (
          <button
            key={label}
            type="button"
            onClick={() => onInsert(label)}
            title={`Insert ${label} — ${desc}`}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-background border border-border text-xs font-mono hover:border-primary/50 hover:bg-primary/5 transition-colors"
          >
            <span className="text-primary">{label}</span>
            <span className="text-muted-foreground hidden sm:inline">— {desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
