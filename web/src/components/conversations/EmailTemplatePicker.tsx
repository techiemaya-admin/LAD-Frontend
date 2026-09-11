'use client';

import { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import {
  Mail, Plus, Send, Loader2, X, Check, AlertCircle,
  FileText, Trash2, ChevronLeft, Sparkles, Paperclip, Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { safeStorage } from '@lad/shared/storage';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogActions,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
  // Document attachments stored in template metadata
  attachments?: { filename: string; url: string; contentType: string; size: number }[];
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

type EmailProvider = 'gmail' | 'outlook' | 'custom';

/** Map UI provider key onto the backend's provider string. */
const toBackendProvider = (p: EmailProvider): string =>
  p === 'outlook' ? 'microsoft'
  : p === 'custom' ? 'custom_smtp'
  : 'google';

// Mirrors the LAD-Email-Comms quota defaults (services/quota_tracker.py)  - 
// past these, the orchestrator paces/pauses, so warn the user up front.
const SAFE_DAILY_VOLUME: Record<EmailProvider, number> = {
  gmail: 400,
  outlook: 250,
  custom: 1000,
};

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
  /** True when the send was queued on the paced broadcast orchestrator  - 
   *  progress lives in the Sent folder rather than this dialog. */
  queued?: boolean;
}

// ── Main Component ────────────────────────────────────────────────────────────

export const EmailTemplatePicker = memo(function EmailTemplatePicker({
  open, onOpenChange, group, provider,
}: EmailTemplatePickerProps) {
  // View: 'list' | 'compose' | 'preview' | 'sending' | 'done'
  const [view, setView]                           = useState<'list' | 'compose' | 'preview' | 'sending' | 'done'>('list');
  const [templates, setTemplates]                 = useState<EmailTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates]   = useState(true);
  const [selected, setSelected]                   = useState<EmailTemplate | null>(null);
  const [search, setSearch]                       = useState('');

  // Compose form
  const [formName, setFormName]                   = useState('');
  const [formSubject, setFormSubject]             = useState('');
  const [formBody, setFormBody]                   = useState('');
  const [formError, setFormError]                 = useState('');
  const [saving, setSaving]                       = useState(false);

  // Preview / send
  const [sendSubject, setSendSubject]             = useState('');
  const [sendBody, setSendBody]                   = useState('');
  const [sendError, setSendError]                 = useState('');
  const [sending, setSending]                     = useState(false);
  const [sendResult, setSendResult]               = useState<SendResult | null>(null);

  // Attachments
  const [attachments, setAttachments]             = useState<File[]>([]);
  const fileInputRef                              = useRef<HTMLInputElement>(null);

  // Test email
  const [testEmailAddr, setTestEmailAddr]         = useState('');
  const [sendingTest, setSendingTest]             = useState(false);
  const [testResult, setTestResult]               = useState<{ ok: boolean; message: string } | null>(null);

  // Delete
  const [deletingId, setDeletingId]               = useState<string | null>(null);

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
      setSearch('');
      setSendResult(null);
      setAttachments([]);
      setTestEmailAddr('');
      setTestResult(null);
      setFormName(''); setFormSubject(''); setFormBody(''); setFormError('');
    }
  }, [open, loadTemplates]);

  const filtered = useMemo(() => {
    if (!search.trim()) return templates;
    const q = search.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        (t.body && t.body.toLowerCase().includes(q))
    );
  }, [templates, search]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectTemplate = useCallback((tpl: EmailTemplate) => {
    setSelected(tpl);
    setSendSubject(tpl.subject);
    setSendBody(tpl.body_html ?? tpl.body ?? '');
    setSendError('');
    // Pre-load any document attachments stored with the template.
    // These are fetched from their URL and converted to File objects so the
    // existing base64 serialisation path in handleSend works unchanged.
    setAttachments([]);
    if (tpl.attachments && tpl.attachments.length > 0) {
      Promise.all(
        tpl.attachments.map(async (att) => {
          try {
            const res = await fetch(att.url);
            if (!res.ok) return null;
            const blob = await res.blob();
            return new File([blob], att.filename, { type: att.contentType || blob.type });
          } catch {
            return null;
          }
        })
      ).then(files => {
        const valid = files.filter((f): f is File => f !== null);
        if (valid.length > 0) setAttachments(valid);
      });
    }
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

      // No attachments → route through the LAD-Email-Comms broadcast
      // orchestrator: records a run in the Sent folder and paces sends
      // (human-like jitter + per-account daily/hourly quotas + sender
      // warm-up) instead of blasting the provider in a tight loop - a
      // 344-recipient burst on the legacy path got a sender flagged as
      // spam. Attachment sends stay on the legacy direct path until the
      // orchestrator supports attachments.
      if (attachments.length === 0) {
        try {
          const acctRes = await fetch('/api/email-comms/accounts', { headers: authHeaders() });
          const acctData = await acctRes.json().catch(() => ({}));
          const accountsList: Array<{ id: string; provider: string; status: string }> =
            acctData.accounts ?? [];
          const account = accountsList.find(
            (a) => a.provider === toBackendProvider(provider) && a.status === 'active',
          );
          if (account) {
            const res = await fetch('/api/email-comms/broadcast/send', {
              method: 'POST',
              headers: authHeaders(),
              body: JSON.stringify({
                from_email_account_id: account.id,
                subject,
                body_html: body,
                group_id: group.id,
              }),
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok && data.broadcast_run_id) {
              setSendResult({
                sent: 0,
                failed: 0,
                total: data.recipient_count ?? recipients.length,
                errors: [],
                queued: true,
              });
              setView('done');
              setSending(false);
              return;
            }
            console.warn('[EmailTemplatePicker] broadcast route failed - falling back to direct send', data);
          }
        } catch (err) {
          console.warn('[EmailTemplatePicker] broadcast route unreachable - falling back to direct send', err);
        }
      }

      // Serialize attachments to base64
      const attachmentPayloads = await Promise.all(
        attachments.map(file => new Promise<{ filename: string; contentType: string; content: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result as string;
            // dataUrl = "data:<mime>;base64,<data>"
            const base64 = dataUrl.split(',')[1];
            resolve({ filename: file.name, contentType: file.type || 'application/octet-stream', content: base64 });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );

      // Map UI provider → backend provider key.
      const backendProvider = toBackendProvider(provider);
      const res = await fetch(`${EMAIL_API}/send-bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          provider: backendProvider,
          recipients,
          subject,
          body_html: body,
          ...(attachmentPayloads.length > 0 ? { attachments: attachmentPayloads } : {}),
        }),
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
        setSendError(data.error || data.detail || 'Send failed - please try again.');
        setView('preview');
      }
    } catch (err) {
      setSendError(String(err));
      setView('preview');
    } finally {
      setSending(false);
    }
  }, [sendSubject, sendBody, group.members, group.id, provider, attachments]);

  const handleSendTest = useCallback(async () => {
    const addr = testEmailAddr.trim();
    if (!addr || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) return;
    const subject = sendSubject.trim();
    const body    = sendBody.trim();
    if (!subject || !body) {
      setTestResult({ ok: false, message: 'Fill in the subject and body first.' });
      return;
    }
    setSendingTest(true);
    setTestResult(null);
    try {
      // Serialize attachments (same as handleSend)
      const attachmentPayloads = await Promise.all(
        attachments.map(file => new Promise<{ filename: string; contentType: string; content: string }>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve({ filename: file.name, contentType: file.type || 'application/octet-stream', content: base64 });
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        }))
      );
      const backendProvider = toBackendProvider(provider);
      const res = await fetch(`${EMAIL_API}/send-bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          provider:    backendProvider,
          recipients:  [{ email: addr, name: 'Test Recipient', company: '' }],
          subject:     `[TEST] ${subject}`,
          body_html:   body,
          ...(attachmentPayloads.length > 0 ? { attachments: attachmentPayloads } : {}),
        }),
      });
      const data = await res.json();
      if (data.success && (data.sent ?? 0) > 0) {
        setTestResult({ ok: true, message: `Test email sent to ${addr}` });
      } else {
        const errMsg = data.errors?.[0]?.error || data.error || data.detail || 'Send failed.';
        setTestResult({ ok: false, message: errMsg });
      }
    } catch (e) {
      setTestResult({ ok: false, message: String(e) });
    } finally {
      setSendingTest(false);
    }
  }, [testEmailAddr, sendSubject, sendBody, attachments, provider]);

  // ── Render ───────────────────────────────────────────────────────────────────

  const providerLabel =
    provider === 'gmail'   ? 'Gmail'
    : provider === 'outlook' ? 'Outlook'
    : 'Custom SMTP';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "sm:w-[90vw] sm:max-w-5xl sm:h-[90vh] flex flex-col p-0 overflow-hidden",
          "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl rounded-2xl"
        )}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex-shrink-0 flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-3 text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {(view === 'compose' || view === 'preview') && (
              <button
                type="button"
                onClick={() => {
                  if (view === 'preview') {
                    setView('list');
                    setSelected(null);
                    setAttachments([]);
                    setTestResult(null);
                    setTestEmailAddr('');
                  } else {
                    setView('list');
                  }
                }}
                className="h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-800/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors shadow-2xs mr-1"
                title="Back to templates"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <div
              className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs"
              style={{ backgroundColor: group.color }}
            >
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="truncate text-zinc-900 dark:text-zinc-100 text-base font-semibold">
                {view === 'list' && `Send Email to "${group.name}"`}
                {view === 'compose' && 'Create New Email Template'}
                {view === 'preview' && (selected?.name || 'Preview & Send Email')}
                {view === 'sending' && 'Sending Campaign…'}
                {view === 'done' && 'Campaign Dispatched'}
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-normal">
                {group.member_count} recipient{group.member_count !== 1 ? 's' : ''} via {providerLabel}
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Body Container */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-zinc-50/40 dark:bg-zinc-950">

          {/* ── List view ─────────────────────────────────────────── */}
          {view === 'list' && (
            <>
              {/* Search & Actions Bar */}
              <div className="px-6 pt-5 pb-2 flex items-center gap-3 flex-shrink-0">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
                  <Input
                    placeholder="Search email templates..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-10 rounded-xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:border-sky-500"
                  />
                </div>
                <Button
                  size="sm"
                  className="h-10 px-4 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-600 dark:bg-sky-500 dark:hover:bg-sky-400 text-white shadow-sm transition-all shrink-0"
                  onClick={() => {
                    setFormName(''); setFormSubject(''); setFormBody(''); setFormError('');
                    setView('compose');
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Create Template
                </Button>
              </div>

              {/* Template List Area */}
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-2">
                {loadingTemplates ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-sky-600 dark:text-sky-400" />
                    <span className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">Loading templates...</span>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-500 dark:text-zinc-400">
                    <FileText className="h-10 w-10 mb-2 text-zinc-400 dark:text-zinc-600 opacity-50" />
                    <p className="text-sm font-medium">
                      {templates.length === 0 ? 'No email templates yet' : 'No templates match your search'}
                    </p>
                    <p className="text-xs mt-1">
                      {templates.length === 0 ? 'Create your first email template to get started' : 'Try searching for another keyword'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map(tpl => (
                      <div
                        key={tpl.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectTemplate(tpl)}
                        onKeyDown={e => e.key === 'Enter' && handleSelectTemplate(tpl)}
                        className="w-full flex items-start gap-3.5 p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 hover:border-sky-400/60 dark:hover:border-sky-500/60 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/70 transition-all text-left group cursor-pointer shadow-2xs"
                      >
                        <div className="h-10 w-10 rounded-lg bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center flex-shrink-0 text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform mt-0.5">
                          <Mail className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                              {tpl.name}
                            </p>
                            {tpl.category && (
                              <Badge variant="outline" className="text-[10px] font-medium px-2 py-0.5 bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/40 rounded-md">
                                {tpl.category}
                              </Badge>
                            )}
                            {tpl.attachments && tpl.attachments.length > 0 && (
                              <span className="flex items-center gap-1 text-[10px] text-zinc-500 dark:text-zinc-400">
                                <Paperclip className="h-3 w-3" />
                                {tpl.attachments.length}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300 truncate mb-1">
                            <span className="text-zinc-400 dark:text-zinc-500 font-normal">Subject: </span>
                            {tpl.subject}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {tpl.body || (tpl.body_html ? tpl.body_html.replace(/<[^>]*>?/gm, '') : 'No content preview')}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteTemplate(tpl.id, e)}
                          disabled={deletingId === tpl.id}
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-zinc-400 dark:text-zinc-500 hover:text-red-600 dark:hover:text-red-400 transition-all flex-shrink-0"
                          title="Delete template"
                        >
                          {deletingId === tpl.id
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Trash2 className="h-4 w-4" />}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── Compose view (2-column desktop layout) ─────────────── */}
          {view === 'compose' && (
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Form Editor (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">Template Name</label>
                    <Input
                      placeholder="e.g. Follow-up, Welcome, Promotion"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      className="h-10 text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:border-sky-500 rounded-xl"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">Subject Line</label>
                    <Input
                      placeholder="Email subject..."
                      value={formSubject}
                      onChange={e => setFormSubject(e.target.value)}
                      className="h-10 text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:border-sky-500 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">Email Body</label>
                    <textarea
                      placeholder={`Hi {name},\n\nWrite your email content here...\n\nBest regards,\nYour Name`}
                      value={formBody}
                      onChange={e => setFormBody(e.target.value)}
                      className="w-full h-64 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-colors"
                    />
                  </div>

                  <PersonalizationHints onInsert={(v) => setFormBody(prev => prev + v)} />

                  {formError && (
                    <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {formError}
                    </div>
                  )}
                </div>

                {/* Right Column: Tips & Context (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-900 space-y-3">
                    <div className="flex items-center gap-2 text-sky-600 dark:text-sky-400 font-semibold text-sm">
                      <Sparkles className="h-4 w-4" />
                      Template Guidelines
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      Saved templates can be reused across all your email broadcast campaigns. You can personalize each message with dynamic merge tags like <code className="text-sky-600 dark:text-sky-400 font-semibold">{`{name}`}</code>, <code className="text-sky-600 dark:text-sky-400 font-semibold">{`{first_name}`}</code>, and <code className="text-sky-600 dark:text-sky-400 font-semibold">{`{company}`}</code>.
                    </p>
                  </div>

                  <div className="p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                      <Mail className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                      Target Broadcast Group
                    </div>
                    <div className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-50/70 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
                      <div
                        className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs"
                        style={{ backgroundColor: group.color }}
                      >
                        {group.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">{group.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{group.member_count} recipients via {providerLabel}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Preview view (2-column desktop layout) ─────────────── */}
          {view === 'preview' && (
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Email Subject, Body & Attachments (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">Subject Line</label>
                    <Input
                      placeholder="Email subject..."
                      value={sendSubject}
                      onChange={e => setSendSubject(e.target.value)}
                      className="h-10 text-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-sky-500/30 focus-visible:border-sky-500 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">Body Content</label>
                    <textarea
                      placeholder="Email body..."
                      value={sendBody}
                      onChange={e => setSendBody(e.target.value)}
                      className="w-full h-64 px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-colors"
                    />
                  </div>

                  <PersonalizationHints onInsert={(v) => setSendBody(prev => prev + v)} />

                  {/* Attachments */}
                  <div className="space-y-2.5 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase tracking-wider">Attachments</label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 font-medium transition-colors"
                      >
                        <Paperclip className="h-3.5 w-3.5" />
                        Attach file
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      className="hidden"
                      onChange={e => {
                        const files = Array.from(e.target.files ?? []);
                        if (files.length) setAttachments(prev => [...prev, ...files]);
                        e.target.value = '';
                      }}
                    />
                    {attachments.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {attachments.map((file, idx) => (
                          <span
                            key={idx}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-800 dark:text-zinc-200 max-w-[220px] shadow-2xs"
                          >
                            <Paperclip className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500 flex-shrink-0" />
                            <span className="truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                              className="ml-1 text-zinc-400 dark:text-zinc-500 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No files attached</p>
                    )}
                  </div>

                  {sendError && (
                    <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-2.5">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {sendError}
                    </div>
                  )}
                </div>

                {/* Right Column: Send Test & Recipients Preview (5 cols) */}
                <div className="lg:col-span-5 space-y-4">
                  {/* Send test email */}
                  <div className="rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50/70 dark:bg-zinc-900 p-4 space-y-3">
                    <p className="text-xs font-semibold flex items-center gap-1.5 text-amber-800 dark:text-zinc-300">
                      <Send className="h-3.5 w-3.5" />
                      Send a test email before broadcast
                    </p>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="your@email.com"
                        value={testEmailAddr}
                        onChange={e => { setTestEmailAddr(e.target.value); setTestResult(null); }}
                        className="h-9 text-xs flex-1 border-amber-200 dark:border-amber-500/30 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:ring-amber-500/30 focus-visible:border-amber-500 rounded-xl"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-9 text-xs px-3.5 shrink-0 border-amber-300 dark:border-amber-500/30 bg-amber-100/50 dark:bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl font-medium"
                        disabled={
                          sendingTest ||
                          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmailAddr.trim()) ||
                          !sendSubject.trim() ||
                          !sendBody.trim()
                        }
                        onClick={handleSendTest}
                      >
                        {sendingTest ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            Sending…
                          </>
                        ) : (
                          'Send Test'
                        )}
                      </Button>
                    </div>
                    {testResult && (
                      <div className={`flex items-start gap-1.5 text-xs rounded-xl px-3 py-2 ${
                        testResult.ok
                          ? 'text-emerald-800 dark:text-emerald-300 bg-emerald-50/80 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20'
                          : 'text-red-800 dark:text-red-300 bg-red-50/80 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20'
                      }`}>
                        {testResult.ok ? (
                          <Check className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                        )}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Quota warning */}
                  {group.member_count > SAFE_DAILY_VOLUME[provider] && (
                    <div className="text-xs text-amber-800 dark:text-amber-200/90 bg-amber-50/80 dark:bg-amber-500/[0.08] border border-amber-200 dark:border-amber-500/25 rounded-2xl p-4 leading-relaxed">
                      <p className="font-semibold mb-1 flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
                        <AlertCircle className="h-3.5 w-3.5" /> High volume notice
                      </p>
                      {group.member_count} recipients exceeds the recommended daily volume for a{' '}
                      {providerLabel} mailbox (~{SAFE_DAILY_VOLUME[provider]}/day). Paced broadcast will protect your sender reputation.
                    </div>
                  )}

                  {/* Recipients list card */}
                  <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800/80 bg-white dark:bg-zinc-900 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                        <Mail className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        Recipients ({group.member_count})
                      </p>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">{group.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {group.members.slice(0, 20).map(m => (
                        <span key={m.id} className="text-xs bg-zinc-50 dark:bg-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1 truncate max-w-[170px] shadow-2xs">
                          {m.contact_name || m.email}
                        </span>
                      ))}
                      {group.members.length > 20 && (
                        <span className="text-xs text-zinc-500 dark:text-zinc-400 px-2 py-1">
                          +{group.members.length - 20} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Sending view ──────────────────────────────────────── */}
          {view === 'sending' && (
            <div className="flex-1 flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-sky-50 dark:bg-sky-500/10 border border-sky-100 dark:border-sky-500/20 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="font-semibold text-lg text-zinc-900 dark:text-zinc-100">Sending campaign…</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                  Dispatching to {group.member_count} recipient{group.member_count !== 1 ? 's' : ''} via {providerLabel}
                </p>
              </div>
            </div>
          )}

          {/* ── Done view ─────────────────────────────────────────── */}
          {view === 'done' && sendResult && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
              <div className="h-16 w-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center">
                <Check className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-xl text-zinc-900 dark:text-zinc-100">
                  {sendResult.queued ? 'Broadcast Queued' : 'Emails Dispatched!'}
                </p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-md">
                  {sendResult.queued
                    ? `Sending to ${sendResult.total} recipient${sendResult.total === 1 ? '' : 's'} via ${providerLabel} - paced to protect your sender reputation. Track progress and opens in the Sent tab.`
                    : `Campaign dispatched via ${providerLabel}`}
                </p>
              </div>
              {!sendResult.queued && (
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs pt-2">
                  <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-zinc-900 border border-emerald-200 dark:border-emerald-500/20">
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{sendResult.sent}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Sent</p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-red-50/80 dark:bg-zinc-900 border border-red-200 dark:border-red-500/20">
                    <p className="text-2xl font-bold text-red-700 dark:text-red-300">{sendResult.failed}</p>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">Failed</p>
                  </div>
                </div>
              )}
              {sendResult.errors.length > 0 && (
                <details className="text-xs text-left w-full max-w-md mt-2">
                  <summary className="cursor-pointer text-red-600 dark:text-red-400 font-medium">
                    {sendResult.errors.length} failed recipients
                  </summary>
                  <ul className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                    {sendResult.errors.map((err, i) => (
                      <li key={i} className="text-zinc-500 dark:text-zinc-400">
                        <span className="text-red-500 dark:text-red-400">·</span> {err.email}: {err.error}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>

        {/* Footer / Actions Bar */}
        <DialogActions className="border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900 px-6 py-3.5 sm:py-4 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div className="text-xs sm:text-sm font-medium text-zinc-500 dark:text-zinc-400 text-center sm:text-left w-full sm:w-auto">
              {view === 'list' && (
                <span>Select a template to preview or create a new one</span>
              )}
              {view === 'compose' && (
                <span>Fill in template details to save & preview</span>
              )}
              {view === 'preview' && (
                <span>Ready to send to {group.member_count} recipient{group.member_count !== 1 ? 's' : ''}</span>
              )}
              {view === 'sending' && (
                <span>Sending in progress...</span>
              )}
              {view === 'done' && (
                <span>Campaign dispatched successfully</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 sm:gap-3 w-full sm:w-auto">
              {view === 'compose' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium flex-1 sm:flex-initial"
                    onClick={() => setView('list')}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 sm:h-10 px-5 sm:px-6 rounded-xl gap-2 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold shadow-sm flex-1 sm:flex-initial"
                    onClick={handleSaveTemplate}
                    disabled={saving || !formName.trim() || !formSubject.trim() || !formBody.trim()}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                    Save & Preview
                  </Button>
                </>
              )}

              {view === 'preview' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 sm:h-10 px-4 sm:px-5 rounded-xl border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium flex-1 sm:flex-initial"
                    onClick={() => { setView('list'); setSelected(null); setAttachments([]); setTestResult(null); setTestEmailAddr(''); }}
                  >
                    Back
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 sm:h-10 px-5 sm:px-7 rounded-xl gap-2 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold shadow-sm flex-1 sm:flex-initial"
                    onClick={handleSend}
                    disabled={sending || !sendSubject.trim() || !sendBody.trim()}
                  >
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Send to {group.member_count} Recipient{group.member_count !== 1 ? 's' : ''}
                      </>
                    )}
                  </Button>
                </>
              )}

              {view === 'done' && (
                <Button
                  size="sm"
                  className="h-9 sm:h-10 px-6 sm:px-8 rounded-xl gap-2 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-semibold shadow-sm w-full sm:w-auto"
                  onClick={() => onOpenChange(false)}
                >
                  <Check className="h-4 w-4" />
                  Done
                </Button>
              )}
            </div>
          </div>
        </DialogActions>
      </DialogContent>
    </Dialog>
  );
});

// ── Personalization Hints ────────────────────────────────────────────────────

function PersonalizationHints({ onInsert }: { onInsert: (v: string) => void }) {
  return (
    <div className="rounded-xl bg-zinc-50/80 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-3.5 space-y-2">
      <div className="flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400" />
        <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Personalisation variables</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {PERSONALIZATION_VARS.map(({ label, desc }) => (
          <button
            key={label}
            type="button"
            onClick={() => onInsert(label)}
            title={`Insert ${label} - ${desc}`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 hover:border-sky-400 dark:hover:border-sky-500/60 hover:bg-sky-50/50 dark:hover:bg-sky-950/30 text-xs font-mono transition-all shadow-xs"
          >
            <span className="text-sky-600 dark:text-sky-400 font-semibold">{label}</span>
            <span className="text-zinc-500 dark:text-zinc-400 hidden sm:inline">: {desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
