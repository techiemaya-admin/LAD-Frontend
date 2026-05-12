'use client';

import {
  useState, useEffect, useCallback, useRef, memo, useMemo,
} from 'react';
import {
  Mail, Users, Plus, Search, UserPlus, Loader2, X,
  Trash2, Send, ChevronRight, RefreshCw, ArrowLeft,
  FileText, Check, Paperclip, ChevronDown, Sparkles,
  Tag, Clock, Building2, AtSign, CheckSquare, Square,
  AlertCircle, Info, MoreVertical, Bold, Italic, Link2,
  Image as ImageIcon, Smile, Star, Archive, CornerUpLeft,
  PanelRightClose, PanelRightOpen, Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { safeStorage } from '@lad/shared/storage';
import { ImportLeadsDialog } from './ImportLeadsDialog';
import { EmailTemplatePicker } from './EmailTemplatePicker';

// ── Types ─────────────────────────────────────────────────────────────────────

interface EmailContact {
  id: string;
  contact_name: string | null;
  email: string | null;
  company: string | null;
  channel: string;
  created_at?: string;
  metadata?: Record<string, unknown>;
}

interface EmailGroup {
  id: string;
  name: string;
  color: string;
  description: string | null;
  channel: string;
  member_count: number;
}

interface EmailGroupDetail extends EmailGroup {
  members: EmailContact[];
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  body_html: string | null;
  category: string;
}

type EmailProvider = 'gmail' | 'outlook' | 'custom';

interface EmailChannelViewProps {
  provider: EmailProvider;
  connectedEmail?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const API            = '/api/email-conversations';
const TEMPLATES_API  = '/api/campaigns/email-templates';

const PROVIDER_COLOR: Record<EmailProvider, string> = {
  gmail:   '#EA4335',
  outlook: '#0078D4',
  custom:  '#059669',  // emerald — matches the integration tile
};

const PROVIDER_LABEL: Record<EmailProvider, string> = {
  gmail:   'Gmail',
  outlook: 'Outlook',
  custom:  'Custom SMTP',
};

const PROVIDER_ICON: Record<EmailProvider, string> = {
  gmail:   '📧',
  outlook: '📨',
  custom:  '✉️',
};

/**
 * Map our UI provider key onto the backend's provider string used by the
 * /send-bulk + /messages endpoints. Single source of truth so we never
 * introduce another `provider === 'outlook' ? 'microsoft' : 'google'` ternary.
 */
function toBackendProvider(p: EmailProvider): string {
  if (p === 'outlook') return 'microsoft';
  if (p === 'custom')  return 'custom_smtp';
  return 'google';
}

const AVATAR_GRADIENTS = [
  'from-indigo-400 to-purple-500',
  'from-blue-400 to-cyan-500',
  'from-emerald-400 to-teal-500',
  'from-orange-400 to-red-500',
  'from-pink-400 to-rose-500',
  'from-violet-400 to-indigo-500',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = safeStorage.getItem('token');
  if (token) h['Authorization'] = `Bearer ${token}`;
  const tenant = typeof window !== 'undefined' ? localStorage.getItem('selectedTenantId') : null;
  if (tenant && tenant !== 'default') h['X-Tenant-ID'] = tenant;
  return h;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function avatarGradient(id: string): string {
  const n = id.charCodeAt(0) + id.charCodeAt(id.length - 1);
  return AVATAR_GRADIENTS[n % AVATAR_GRADIENTS.length];
}

function formatDate(iso?: string): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch { return ''; }
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ name, id, size = 'md' }: { name?: string | null; id: string; size?: 'sm' | 'md' | 'lg' }) {
  const sz = size === 'sm' ? 'h-8 w-8 text-[10px]' : size === 'lg' ? 'h-12 w-12 text-base' : 'h-9 w-9 text-xs';
  return (
    <div className={cn(
      'rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold flex-shrink-0',
      sz,
      avatarGradient(id),
    )}>
      {getInitials(name)}
    </div>
  );
}

// ── Inline Template Picker (popover) ──────────────────────────────────────────

interface InlineTemplatePickerProps {
  onSelect: (tpl: EmailTemplate) => void;
  onClose: () => void;
}

function InlineTemplatePicker({ onSelect, onClose }: InlineTemplatePickerProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${TEMPLATES_API}?isActive=true`, { headers: authHeaders() });
        const data = await res.json();
        setTemplates(data.templates ?? data.data ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  const filtered = templates.filter(t =>
    !search ||
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-80 bg-popover border border-border rounded-xl shadow-xl z-30 overflow-hidden"
    >
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Email Templates
        </p>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-8 text-xs pl-8"
          />
        </div>
      </div>
      <div className="max-h-60 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-6 text-xs text-muted-foreground">
            {templates.length === 0 ? 'No templates yet' : 'No matches'}
          </div>
        ) : (
          filtered.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className="w-full flex items-start gap-3 px-3 py-3 hover:bg-muted/40 transition-colors text-left border-b border-border/50 last:border-0"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <FileText className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{tpl.name}</p>
                <p className="text-xs text-muted-foreground truncate">{tpl.subject}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ── Add to Group Modal ────────────────────────────────────────────────────────

interface AddToGroupModalProps {
  groups: EmailGroup[];
  provider: EmailProvider;
  contactIds: string[];
  onDone: () => void;
  onClose: () => void;
}

function AddToGroupModal({ groups, provider, contactIds, onDone, onClose }: AddToGroupModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding]     = useState(false);
  const [done, setDone]         = useState(false);

  const handleAdd = useCallback(async () => {
    if (!selected) return;
    setAdding(true);
    try {
      await fetch(`${API}/groups/${selected}/contacts`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ contact_ids: contactIds }),
      });
      setDone(true);
      setTimeout(() => { onDone(); }, 1200);
    } finally {
      setAdding(false);
    }
  }, [selected, contactIds, onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Add to Broadcast Group</h3>
            <p className="text-xs text-muted-foreground mt-0.5">{contactIds.length} contact{contactIds.length !== 1 ? 's' : ''} selected</p>
          </div>
          <button onClick={onClose} className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {done ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-6 w-6 text-green-600" />
            </div>
            <p className="text-sm font-medium">Added successfully!</p>
          </div>
        ) : (
          <>
            <div className="max-h-60 overflow-y-auto p-3 space-y-1">
              {groups.filter(g => g.channel === provider).map(g => (
                <button
                  key={g.id}
                  onClick={() => setSelected(g.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left',
                    selected === g.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-border/80 hover:bg-muted/30',
                  )}
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: g.color }}
                  >
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.member_count} members</p>
                  </div>
                  {selected === g.id && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </button>
              ))}
              {groups.filter(g => g.channel === provider).length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">No broadcast groups yet</p>
              )}
            </div>
            <div className="px-4 py-3 border-t border-border flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button size="sm" className="flex-1" onClick={handleAdd} disabled={!selected || adding}>
                {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                Add to Group
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Contact Details Panel (right panel) ──────────────────────────────────────

interface ContactDetailsPanelProps {
  contact: EmailContact;
  provider: EmailProvider;
  groups: EmailGroup[];
  onClose: () => void;
  onAddToGroup: () => void;
}

function ContactDetailsPanel({ contact, provider, groups, onClose, onAddToGroup }: ContactDetailsPanelProps) {
  const providerColor = PROVIDER_COLOR[provider];
  const providerLabel = PROVIDER_LABEL[provider];

  const contactGroups = groups.filter(g => g.channel === provider);

  return (
    <div className="w-72 flex-shrink-0 flex flex-col border-l border-border bg-card overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact Details</span>
        <button
          onClick={onClose}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Avatar + name */}
      <div className="flex flex-col items-center px-4 py-6 border-b border-border">
        <div className={cn(
          'h-16 w-16 rounded-full bg-gradient-to-br flex items-center justify-center text-white text-xl font-bold mb-3',
          avatarGradient(contact.id),
        )}>
          {getInitials(contact.contact_name)}
        </div>
        <h2 className="font-semibold text-sm text-center">{contact.contact_name || 'Unknown'}</h2>
        {contact.company && (
          <p className="text-xs text-muted-foreground mt-0.5 text-center">{contact.company}</p>
        )}
        {/* Channel badge */}
        <div
          className="mt-2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium text-white"
          style={{ backgroundColor: providerColor }}
        >
          <Mail className="h-3 w-3" />
          {providerLabel}
        </div>
      </div>

      {/* Contact info rows */}
      <div className="px-4 py-4 space-y-3 border-b border-border">
        <ContactInfoRow icon={AtSign} label="Email" value={contact.email || '—'} />
        {contact.company && (
          <ContactInfoRow icon={Building2} label="Company" value={contact.company} />
        )}
        {contact.created_at && (
          <ContactInfoRow icon={Clock} label="Added" value={formatDate(contact.created_at)} />
        )}
        <ContactInfoRow icon={Hash} label="Channel" value={providerLabel} />
      </div>

      {/* Labels */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Labels</span>
          <button className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors">
            <Plus className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
        <p className="text-xs text-muted-foreground">No labels assigned</p>
      </div>

      {/* Broadcast groups */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Broadcast Groups</span>
        </div>
        {contactGroups.length === 0 ? (
          <p className="text-xs text-muted-foreground">No groups yet</p>
        ) : (
          <div className="space-y-1.5">
            {contactGroups.slice(0, 3).map(g => (
              <div key={g.id} className="flex items-center gap-2">
                <div
                  className="h-5 w-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                  style={{ backgroundColor: g.color }}
                >
                  {g.name.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs truncate">{g.name}</span>
              </div>
            ))}
          </div>
        )}
        <button
          onClick={onAddToGroup}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-dashed border-primary/30 text-primary hover:bg-primary/5 text-xs font-medium transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add to Group
        </button>
      </div>

      {/* Metadata */}
      <div className="px-4 py-4">
        <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Metadata</span>
        <div className="mt-2 space-y-1.5">
          <MetaRow label="Status" value="Active" />
          <MetaRow label="Channel" value={providerLabel} />
          <MetaRow label="Owner" value="—" />
        </div>
      </div>
    </div>
  );
}

function ContactInfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="h-7 w-7 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xs font-medium">{value}</span>
    </div>
  );
}

// ── Email Message Type ────────────────────────────────────────────────────────

interface EmailMessage {
  id: string;
  contact_id: string;
  direction: 'outbound' | 'inbound';
  provider: string;
  subject: string;
  body_html: string | null;
  preview_text: string | null;
  status: string;
  sent_at: string;
}

// ── Email Compose Panel (middle — thread + compose) ───────────────────────────

interface EmailComposePanelProps {
  contact: EmailContact;
  provider: EmailProvider;
  onShowDetails: () => void;
  showDetails: boolean;
}

function EmailComposePanel({ contact, provider, onShowDetails, showDetails }: EmailComposePanelProps) {
  const [subject, setSubject]       = useState('');
  const [body, setBody]             = useState('');
  const [sending, setSending]       = useState(false);
  const [sent, setSent]             = useState(false);
  const [error, setError]           = useState('');
  const [showTemplate, setShowTemplate] = useState(false);
  const [attachments, setAttachments]   = useState<File[]>([]);

  // Thread state
  const [messages, setMessages]           = useState<EmailMessage[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [expandedIds, setExpandedIds]     = useState<Set<string>>(new Set());

  const fileRef        = useRef<HTMLInputElement>(null);
  const bodyRef        = useRef<HTMLTextAreaElement>(null);
  const threadEndRef   = useRef<HTMLDivElement>(null);

  const providerColor = PROVIDER_COLOR[provider];
  const providerLabel = PROVIDER_LABEL[provider];

  // ── Load thread ──────────────────────────────────────────────────────────────
  const loadThread = useCallback(async () => {
    if (!contact.id) return;
    setLoadingThread(true);
    try {
      const res = await fetch(`${API}/messages?contact_id=${contact.id}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data) ? data : (data.messages ?? []));
      }
    } catch {
      // silently ignore network errors on thread load
    } finally {
      setLoadingThread(false);
    }
  }, [contact.id]);

  // Reset + reload when contact changes
  useEffect(() => {
    setSubject('');
    setBody('');
    setError('');
    setSent(false);
    setAttachments([]);
    setMessages([]);
    setExpandedIds(new Set());
    loadThread();
  }, [contact.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages.length]);

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleTemplateSelect = useCallback((tpl: EmailTemplate) => {
    setSubject(tpl.subject);
    setBody(tpl.body_html ?? tpl.body ?? '');
    setShowTemplate(false);
    bodyRef.current?.focus();
  }, []);

  const handleSend = useCallback(async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Subject and body are required.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const backendProvider = toBackendProvider(provider);

      // Serialize File[] → base64 payloads
      const attachmentPayloads = await Promise.all(
        attachments.map(file => new Promise<{ filename: string; contentType: string; content: string }>(
          (resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              const base64 = dataUrl.split(',')[1] ?? '';
              resolve({ filename: file.name, contentType: file.type || 'application/octet-stream', content: base64 });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          }
        )),
      );

      const res = await fetch(`${API}/send-bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          provider: backendProvider,
          recipients: [{
            email: contact.email!,
            name: contact.contact_name || '',
            company: contact.company || '',
          }],
          subject: subject.trim(),
          body_html: body.trim(),
          ...(attachmentPayloads.length ? { attachments: attachmentPayloads } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Persist to email_messages thread table
        try {
          await fetch(`${API}/messages`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
              contact_id: contact.id,
              direction: 'outbound',
              provider,
              subject: subject.trim(),
              body_html: body.trim(),
              status: 'sent',
            }),
          });
        } catch { /* non-fatal — send succeeded, history write failed */ }

        // Optimistically append to thread
        const optimistic: EmailMessage = {
          id: `opt-${Date.now()}`,
          contact_id: contact.id,
          direction: 'outbound',
          provider,
          subject: subject.trim(),
          body_html: body.trim(),
          preview_text: body.trim().replace(/<[^>]+>/g, '').slice(0, 200),
          status: 'sent',
          sent_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimistic]);

        setSent(true);
        setTimeout(() => {
          setSent(false);
          setSubject('');
          setBody('');
          setAttachments([]);
        }, 2000);
      } else {
        setError(data.error || data.detail || 'Failed to send. Please try again.');
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSending(false);
    }
  }, [subject, body, contact, provider, attachments]);

  const insertVar = useCallback((varLabel: string) => {
    const el = bodyRef.current;
    if (!el) { setBody(prev => prev + varLabel); return; }
    const start = el.selectionStart ?? body.length;
    const end   = el.selectionEnd   ?? body.length;
    const next  = body.slice(0, start) + varLabel + body.slice(end);
    setBody(next);
    setTimeout(() => {
      el.selectionStart = start + varLabel.length;
      el.selectionEnd   = start + varLabel.length;
      el.focus();
    }, 0);
  }, [body]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const formatMsgDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">

      {/* ── Header ── */}
      <div className="h-16 px-4 flex items-center gap-3 bg-card border-b border-border flex-shrink-0">
        <Avatar name={contact.contact_name} id={contact.id} size="md" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{contact.contact_name || 'Unknown'}</h3>
          <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: providerColor }} />
            {contact.email}
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={loadThread}
            title="Refresh thread"
            className="h-8 w-8 flex items-center justify-center rounded-lg border border-border hover:bg-muted text-muted-foreground transition-colors"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loadingThread && 'animate-spin')} />
          </button>
          <button
            onClick={onShowDetails}
            title={showDetails ? 'Hide details' : 'Show contact details'}
            className={cn(
              'h-8 w-8 flex items-center justify-center rounded-lg border transition-colors',
              showDetails
                ? 'border-primary/30 bg-primary/5 text-primary'
                : 'border-border hover:bg-muted text-muted-foreground',
            )}
          >
            {showDetails ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ── Thread area ── */}
      <div className="flex-1 overflow-y-auto bg-muted/10 px-4 py-3 flex flex-col gap-2 min-h-0">
        {loadingThread ? (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          /* Empty state */
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-14">
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: providerColor + '18', border: `2px solid ${providerColor}28` }}
            >
              <Mail className="h-6 w-6" style={{ color: providerColor }} />
            </div>
            <div className="text-center">
              <p className="font-medium text-sm">Start a conversation</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Send an email to {contact.contact_name || contact.email} via {providerLabel}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-1">
              {['Follow up', 'Introduction', 'Proposal', 'Meeting request'].map(label => (
                <button
                  key={label}
                  onClick={() => setSubject(label)}
                  className="px-3 py-1.5 rounded-full border border-border text-xs hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Thread messages */
          <>
            {messages.map((msg) => {
              const isOut = msg.direction === 'outbound';
              const expanded = expandedIds.has(msg.id);
              return (
                <div
                  key={msg.id}
                  className={cn(
                    'rounded-xl border bg-card shadow-sm overflow-hidden transition-shadow hover:shadow-md',
                    isOut ? 'ml-6' : 'mr-6',
                  )}
                >
                  {/* Collapsed header — click to expand */}
                  <button
                    type="button"
                    className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    onClick={() => toggleExpand(msg.id)}
                  >
                    {/* Direction dot */}
                    <span
                      className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5"
                      style={{ backgroundColor: isOut ? providerColor : '#9ca3af' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold">
                          {isOut ? 'You' : (contact.contact_name || contact.email)}
                        </span>
                        {isOut && (
                          <span
                            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                            style={{ backgroundColor: providerColor }}
                          >
                            {providerLabel}
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-auto flex-shrink-0">
                          {formatMsgDate(msg.sent_at)}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground/80 truncate mt-0.5">
                        {msg.subject || '(no subject)'}
                      </p>
                      {!expanded && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {msg.preview_text || msg.body_html?.replace(/<[^>]+>/g, '').slice(0, 120) || ''}
                        </p>
                      )}
                    </div>
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5 transition-transform',
                        expanded && 'rotate-180',
                      )}
                    />
                  </button>

                  {/* Expanded body */}
                  {expanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/40">
                      {msg.body_html ? (
                        <div
                          className="prose prose-sm max-w-none text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: msg.body_html }}
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No content</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={threadEndRef} className="h-1" />
          </>
        )}
      </div>

      {/* ── Compose box ── */}
      <div className="border-t border-border bg-card flex-shrink-0">
        {/* Subject */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/60">
          <span className="text-xs text-muted-foreground w-14 flex-shrink-0">Subject</span>
          <input
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground/60"
            placeholder="Email subject..."
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
        </div>

        {/* Body */}
        <div className="px-4 pt-2 pb-1 relative">
          <textarea
            ref={bodyRef}
            placeholder={`Hi ${contact.contact_name?.split(' ')[0] || '{name}'},\n\nWrite your message here...`}
            value={body}
            onChange={e => setBody(e.target.value)}
            className="w-full h-28 bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground/50"
          />
          {showTemplate && (
            <InlineTemplatePicker
              onSelect={handleTemplateSelect}
              onClose={() => setShowTemplate(false)}
            />
          )}
        </div>

        {/* Personalization vars */}
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {['{name}', '{first_name}', '{company}', '{email}'].map(v => (
            <button
              key={v}
              onClick={() => insertVar(v)}
              className="px-2 py-0.5 rounded bg-muted border border-border text-[10px] font-mono text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            >
              {v}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Toolbar + Send */}
        <div className="px-4 py-2.5 border-t border-border/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <ToolbarButton
              icon={FileText}
              label="Use template"
              active={showTemplate}
              onClick={() => setShowTemplate(v => !v)}
            />
            <ToolbarButton
              icon={Paperclip}
              label="Attach file"
              onClick={() => fileRef.current?.click()}
            />
            <input
              ref={fileRef}
              type="file"
              multiple
              className="hidden"
              onChange={e => setAttachments(prev => [...prev, ...Array.from(e.target.files || [])])}
            />
            <ToolbarButton icon={ImageIcon} label="Insert image" onClick={() => {}} />
            <ToolbarButton icon={Smile} label="Emoji" onClick={() => {}} />
            <div className="w-px h-4 bg-border mx-1" />
            <ToolbarButton icon={Bold} label="Bold" onClick={() => insertVar('**bold**')} />
            <ToolbarButton icon={Italic} label="Italic" onClick={() => insertVar('*italic*')} />
            <ToolbarButton icon={Link2} label="Insert link" onClick={() => insertVar('[link text](url)')} />
          </div>

          {attachments.length > 0 && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <Paperclip className="h-3 w-3" />
              {attachments.length}
            </span>
          )}

          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs ml-auto"
            style={{ backgroundColor: sent ? '#10b981' : providerColor, borderColor: 'transparent' }}
            onClick={handleSend}
            disabled={sending || !subject.trim() || !body.trim() || !contact.email}
          >
            {sent ? (
              <><Check className="h-3.5 w-3.5" /> Sent!</>
            ) : sending ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
            ) : (
              <><Send className="h-3.5 w-3.5" /> Send via {PROVIDER_LABEL[provider]}</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton({
  icon: Icon, label, onClick, active,
}: { icon: React.ElementType; label: string; onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded-md transition-colors',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ── Multi-select Action Bar ───────────────────────────────────────────────────

interface MultiSelectBarProps {
  count: number;
  provider: EmailProvider;
  groups: EmailGroup[];
  selectedContacts: EmailContact[];
  onSendTemplate: () => void;
  onAddToGroup: () => void;
  onCancel: () => void;
}

function MultiSelectBar({
  count, provider, groups, selectedContacts,
  onSendTemplate, onAddToGroup, onCancel,
}: MultiSelectBarProps) {
  const providerColor = PROVIDER_COLOR[provider];

  return (
    <div className="border-t border-border bg-card flex-shrink-0 px-3 py-2.5 space-y-2">
      {/* Row 1 — count + cancel */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="h-5 w-5 rounded flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
            style={{ backgroundColor: providerColor }}
          >
            {count}
          </div>
          <span className="text-xs font-medium text-foreground">
            {count} contact{count !== 1 ? 's' : ''} selected
          </span>
        </div>
        <button
          onClick={onCancel}
          title="Cancel selection"
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted transition-colors text-muted-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Row 2 — action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onAddToGroup}
          disabled={count === 0}
          className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg border border-border bg-background hover:bg-muted text-xs font-medium transition-colors disabled:opacity-40"
        >
          <Users className="h-3.5 w-3.5" />
          Add to Group
        </button>
        <button
          onClick={onSendTemplate}
          disabled={count === 0}
          className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-lg text-white text-xs font-medium transition-colors disabled:opacity-40"
          style={{ backgroundColor: count > 0 ? providerColor : undefined }}
        >
          <Send className="h-3 w-3" />
          Send Email
        </button>
      </div>
    </div>
  );
}

// ── Email Group Window ────────────────────────────────────────────────────────

interface EmailGroupWindowProps {
  group: EmailGroup;
  provider: EmailProvider;
  onBack: () => void;
  onGroupDeleted: () => void;
}

const EmailGroupWindow = memo(function EmailGroupWindow({
  group, provider, onBack, onGroupDeleted,
}: EmailGroupWindowProps) {
  const [detail, setDetail]           = useState<EmailGroupDetail | null>(null);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [showSend, setShowSend]       = useState(false);
  const [showImport, setShowImport]   = useState(false);
  const [removingId, setRemovingId]   = useState<string | null>(null);
  const [removedIds, setRemovedIds]   = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting]       = useState(false);

  const providerColor = PROVIDER_COLOR[provider];

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/groups/${group.id}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setDetail(data.data);
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  useEffect(() => { loadDetail(); }, [loadDetail]);

  const handleRemoveMember = useCallback(async (contactId: string) => {
    setRemovingId(contactId);
    try {
      await fetch(`${API}/groups/${group.id}/contacts/${contactId}`, {
        method: 'DELETE', headers: authHeaders(),
      });
      setRemovedIds(prev => new Set([...prev, contactId]));
    } finally {
      setRemovingId(null);
    }
  }, [group.id]);

  const handleDeleteGroup = useCallback(async () => {
    setDeleting(true);
    try {
      await fetch(`${API}/groups/${group.id}`, { method: 'DELETE', headers: authHeaders() });
      onGroupDeleted();
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [group.id, onGroupDeleted]);

  const visibleMembers = (detail?.members || []).filter(
    m => !removedIds.has(m.id) &&
    (!search ||
      (m.contact_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.email || '').toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-16 px-4 flex items-center gap-3 bg-card border-b border-border flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div
          className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: group.color }}
        >
          {group.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{group.name}</h3>
          <p className="text-xs text-muted-foreground">
            {PROVIDER_ICON[provider]} {PROVIDER_LABEL[provider]} broadcast · {detail?.member_count ?? group.member_count} members
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 h-8 text-xs"
          style={{ backgroundColor: providerColor, borderColor: 'transparent' }}
          onClick={() => setShowSend(true)}
          disabled={!detail || detail.member_count === 0}
        >
          <Send className="h-3.5 w-3.5" />
          Send Email
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setShowImport(true)}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Add Members
        </Button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-3">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Members', value: detail?.member_count ?? 0, icon: Users, color: 'text-blue-600 bg-blue-50' },
              { label: 'Channel', value: PROVIDER_LABEL[provider], icon: Mail, color: 'text-green-600 bg-green-50' },
              { label: 'Status', value: 'Active', icon: Check, color: 'text-emerald-600 bg-emerald-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="p-3 rounded-xl border border-border bg-card">
                <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center mb-2', color)}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-semibold text-sm">{value}</p>
              </div>
            ))}
          </div>

          {/* Members list */}
          <div className="flex-1 flex flex-col bg-card rounded-xl border border-border overflow-hidden">
            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Members ({visibleMembers.length})</span>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search members..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="h-8 text-xs pl-8"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {visibleMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <Users className="h-8 w-8 mb-2 opacity-30" />
                  <p className="text-sm">No members yet</p>
                  <p className="text-xs mt-1">Import contacts to add members</p>
                </div>
              ) : (
                visibleMembers.map(member => (
                  <div
                    key={member.id}
                    className="px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors group/member border-b border-border/50 last:border-0"
                  >
                    <Avatar name={member.contact_name} id={member.id} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.contact_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                        {member.company ? ` · ${member.company}` : ''}
                      </p>
                    </div>
                    <button
                      className="opacity-0 group-hover/member:opacity-100 h-7 w-7 flex items-center justify-center rounded-md hover:bg-red-50 text-red-500 transition-all"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removingId === member.id}
                    >
                      {removingId === member.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <X className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Danger zone */}
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-red-500 hover:bg-red-50 text-sm transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Delete group
          </button>
        </div>
      )}

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40">
          <div className="bg-card border border-border rounded-xl shadow-xl p-5 mx-4 w-full max-w-sm">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-500" /> Delete "{group.name}"?
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              This group and all its members will be permanently deleted.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={handleDeleteGroup}
                disabled={deleting}
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Import leads */}
      {showImport && (
        <ImportLeadsDialog
          open={showImport}
          onOpenChange={setShowImport}
          onImportComplete={() => loadDetail()}
          channel={provider}
          emailGroupId={group.id}
        />
      )}

      {/* Send template email to group */}
      {showSend && detail && (
        <EmailTemplatePicker
          open={showSend}
          onOpenChange={setShowSend}
          group={detail}
          provider={provider}
        />
      )}
    </div>
  );
});

// ── Contact Row ───────────────────────────────────────────────────────────────

interface ContactRowProps {
  contact: EmailContact;
  isSelected: boolean;
  isActive: boolean;
  selectionMode: boolean;
  onClick: (c: EmailContact) => void;
  onDoubleClick: (c: EmailContact) => void;
}

const ContactRow = memo(function ContactRow({
  contact, isSelected, isActive, selectionMode, onClick, onDoubleClick,
}: ContactRowProps) {
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = useCallback(() => {
    if (selectionMode) {
      onClick(contact);
      return;
    }
    // Distinguish single vs double-click
    if (clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      onDoubleClick(contact);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        onClick(contact);
      }, 220);
    }
  }, [contact, selectionMode, onClick, onDoubleClick]);

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      onClick={handleClick}
      className={cn(
        'px-3 py-2.5 flex items-center gap-3 transition-colors cursor-pointer select-none',
        isActive && !selectionMode ? 'bg-primary/8 border-l-2 border-primary' : 'border-l-2 border-transparent',
        'hover:bg-muted/40',
      )}
    >
      {/* Checkbox (selection mode) */}
      {selectionMode && (
        <div className="flex-shrink-0 text-primary transition-transform">
          {isSelected
            ? <CheckSquare className="h-4 w-4 text-primary" />
            : <Square className="h-4 w-4 text-muted-foreground" />}
        </div>
      )}

      <Avatar name={contact.contact_name} id={contact.id} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className={cn('text-sm font-medium truncate', isActive && !selectionMode && 'text-primary')}>
            {contact.contact_name || 'Unknown'}
          </p>
          {/* Import-origin badge — informational only, contact is usable from either provider */}
          <span
            className="flex-shrink-0 text-[9px] font-semibold px-1 py-0.5 rounded text-white leading-none"
            style={{ backgroundColor: contact.channel === 'outlook' ? '#0078D4' : '#EA4335' }}
          >
            {contact.channel === 'outlook' ? 'OL' : 'GM'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
        {contact.company && (
          <p className="text-[10px] text-muted-foreground/70 truncate">{contact.company}</p>
        )}
      </div>
    </div>
  );
});

// ── Main Email Channel View ───────────────────────────────────────────────────

export function EmailChannelView({ provider, connectedEmail }: EmailChannelViewProps) {
  // Data
  const [contacts, setContacts]       = useState<EmailContact[]>([]);
  const [groups, setGroups]           = useState<EmailGroup[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingGroups, setLoadingGroups]     = useState(true);

  // Search
  const [contactSearch, setContactSearch] = useState('');
  const [groupSearch, setGroupSearch]     = useState('');

  // Selection
  const [activeContact, setActiveContact]   = useState<EmailContact | null>(null);
  const [showDetails, setShowDetails]       = useState(true);
  const [selectionMode, setSelectionMode]   = useState(false);
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set());

  // Group detail view
  const [activeGroup, setActiveGroup]       = useState<EmailGroup | null>(null);

  // Dialogs
  const [showImport, setShowImport]         = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName]     = useState('');
  const [creatingGroup, setCreatingGroup]   = useState(false);

  // Multi-select actions
  const [showBulkSend, setShowBulkSend]     = useState(false);
  const [showAddToGroup, setShowAddToGroup] = useState(false);
  const [groupRefreshKey, setGroupRefreshKey] = useState(0);

  // ── Load data ──────────────────────────────────────────────────────────────

  const loadContacts = useCallback(async (search = '') => {
    setLoadingContacts(true);
    try {
      // No channel filter — backend returns all email contacts (gmail + outlook) for both tabs.
      // channel is stored as import-origin metadata only; send-provider is chosen at send time.
      const qs = new URLSearchParams({ limit: '500', ...(search ? { search } : {}) });
      const res = await fetch(`${API}/contacts?${qs}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setContacts(data.data || []);
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true);
    try {
      const res = await fetch(`${API}/groups?channel=${provider}`, { headers: authHeaders() });
      const data = await res.json();
      if (data.success) setGroups(data.data || []);
    } finally {
      setLoadingGroups(false);
    }
  }, [provider]);

  useEffect(() => { loadContacts(); loadGroups(); }, [loadContacts, loadGroups, groupRefreshKey]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleContactClick = useCallback((c: EmailContact) => {
    if (selectionMode) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(c.id)) next.delete(c.id);
        else next.add(c.id);
        return next;
      });
    } else {
      setActiveContact(c);
    }
  }, [selectionMode]);

  const handleContactDoubleClick = useCallback((c: EmailContact) => {
    setSelectionMode(true);
    setSelectedIds(new Set([c.id]));
    setActiveContact(null);
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleCreateGroup = useCallback(async () => {
    const name = newGroupName.trim();
    if (!name) return;
    setCreatingGroup(true);
    try {
      const res = await fetch(`${API}/groups`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ name, channel: provider }),
      });
      const data = await res.json();
      if (data.success) {
        setGroups(prev => [data.data, ...prev]);
        setNewGroupName('');
        setShowCreateGroup(false);
        setActiveGroup(data.data);
      }
    } finally {
      setCreatingGroup(false);
    }
  }, [newGroupName, provider]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const filteredContacts = useMemo(() =>
    contacts.filter(c =>
      !contactSearch ||
      (c.contact_name || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
      (c.email || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(contactSearch.toLowerCase()),
    ),
    [contacts, contactSearch],
  );

  const filteredGroups = useMemo(() =>
    groups.filter(g => !groupSearch || g.name.toLowerCase().includes(groupSearch.toLowerCase())),
    [groups, groupSearch],
  );

  const selectedContacts = useMemo(() =>
    contacts.filter(c => selectedIds.has(c.id)),
    [contacts, selectedIds],
  );

  // Build a fake EmailGroupDetail for bulk-send via EmailTemplatePicker
  const bulkSendGroup = useMemo((): EmailGroupDetail | null => {
    if (selectedContacts.length === 0) return null;
    return {
      id: 'bulk-selection',
      name: `${selectedContacts.length} selected contact${selectedContacts.length !== 1 ? 's' : ''}`,
      color: PROVIDER_COLOR[provider],
      description: null,
      channel: provider,
      member_count: selectedContacts.length,
      members: selectedContacts,
    };
  }, [selectedContacts, provider]);

  const providerColor = PROVIDER_COLOR[provider];
  const providerLabel = PROVIDER_LABEL[provider];
  const providerIcon  = PROVIDER_ICON[provider];

  // ── Group detail view ──────────────────────────────────────────────────────

  if (activeGroup) {
    return (
      <div className="flex-1 flex overflow-hidden relative">
        <EmailGroupWindow
          group={activeGroup}
          provider={provider}
          onBack={() => setActiveGroup(null)}
          onGroupDeleted={() => { setActiveGroup(null); setGroupRefreshKey(k => k + 1); }}
        />
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex overflow-hidden">

      {/* ── Left Sidebar ────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col border-r border-border bg-card overflow-hidden">

        {/* Sidebar header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-lg">{providerIcon}</span>
            <div>
              <p className="text-sm font-semibold">{providerLabel}</p>
              {connectedEmail && (
                <p className="text-[11px] text-muted-foreground">{connectedEmail}</p>
              )}
            </div>
          </div>
          <div className="flex gap-1">
            <button
              title="Import leads"
              onClick={() => setShowImport(true)}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <UserPlus className="h-3.5 w-3.5" />
            </button>
            <button
              title="Refresh"
              onClick={() => { loadContacts(); loadGroups(); }}
              className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Broadcast groups */}
        <div className="border-b border-border flex-shrink-0">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Broadcast Groups
            </span>
            <button
              title="New group"
              onClick={() => setShowCreateGroup(true)}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted transition-colors"
            >
              <Plus className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Inline create */}
          {showCreateGroup && (
            <div className="px-3 pb-3 space-y-2">
              <Input
                placeholder="Group name..."
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleCreateGroup();
                  if (e.key === 'Escape') setShowCreateGroup(false);
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="flex-1 h-7 text-xs"
                  onClick={handleCreateGroup}
                  disabled={creatingGroup || !newGroupName.trim()}
                >
                  {creatingGroup && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                  Create
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setShowCreateGroup(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="max-h-44 overflow-y-auto custom-scrollbar">
            {loadingGroups ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4 px-4">
                No broadcast groups — create one above
              </p>
            ) : (
              filteredGroups.map(g => (
                <button
                  key={g.id}
                  onClick={() => setActiveGroup(g)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left"
                >
                  <div
                    className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: g.color }}
                  >
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{g.name}</p>
                    <p className="text-xs text-muted-foreground">{g.member_count} members</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Contacts section */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between flex-shrink-0">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Contacts ({contacts.length})
            </span>
            {selectionMode && (
              <button
                onClick={exitSelectionMode}
                className="text-[11px] text-primary hover:underline"
              >
                Cancel
              </button>
            )}
          </div>

          {/* Hint for double-click */}
          {!selectionMode && contacts.length > 0 && (
            <p className="px-4 pb-1 text-[10px] text-muted-foreground/60">
              Click to compose · Double-click to select multiple
            </p>
          )}

          {/* Contact search */}
          <div className="px-3 pb-2 flex-shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                value={contactSearch}
                onChange={e => setContactSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loadingContacts ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center text-muted-foreground">
                <Mail className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">No contacts yet</p>
                <button onClick={() => setShowImport(true)} className="mt-2 text-xs text-primary hover:underline">
                  Import leads
                </button>
              </div>
            ) : (
              filteredContacts.map(c => (
                <ContactRow
                  key={c.id}
                  contact={c}
                  isActive={activeContact?.id === c.id}
                  isSelected={selectedIds.has(c.id)}
                  selectionMode={selectionMode}
                  onClick={handleContactClick}
                  onDoubleClick={handleContactDoubleClick}
                />
              ))
            )}
          </div>

          {/* Import CTA */}
          <div className="p-3 border-t border-border flex-shrink-0">
            <button
              onClick={() => setShowImport(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-primary/30 text-primary hover:bg-primary/5 text-xs font-medium transition-colors"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Import Leads
            </button>
          </div>
        </div>

        {/* Multi-select bar at bottom of sidebar */}
        {selectionMode && (
          <MultiSelectBar
            count={selectedIds.size}
            provider={provider}
            groups={groups}
            selectedContacts={selectedContacts}
            onSendTemplate={() => setShowBulkSend(true)}
            onAddToGroup={() => setShowAddToGroup(true)}
            onCancel={exitSelectionMode}
          />
        )}
      </div>

      {/* ── Middle: compose or empty state ──────────────────────── */}
      {activeContact ? (
        <EmailComposePanel
          contact={activeContact}
          provider={provider}
          showDetails={showDetails}
          onShowDetails={() => setShowDetails(v => !v)}
        />
      ) : (
        /* Empty state */
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/10 px-6">
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center text-white text-2xl mb-4"
            style={{ backgroundColor: providerColor }}
          >
            {providerIcon}
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-1">{providerLabel} Emails</h2>
          <p className="text-sm mb-2 max-w-xs text-center text-muted-foreground">
            Click a contact to compose an email, or manage broadcast campaigns to groups
          </p>
          <p className="text-xs text-muted-foreground/60 mb-6 max-w-xs text-center">
            Double-click any contact to enter multi-select mode for bulk actions
          </p>
          <div className="flex gap-3 flex-wrap justify-center">
            <Button
              onClick={() => setShowCreateGroup(true)}
              style={{ backgroundColor: providerColor, borderColor: 'transparent' }}
              className="gap-2 text-white hover:opacity-90"
            >
              <Plus className="h-4 w-4" />
              New Broadcast Group
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Import Leads
            </Button>
          </div>
        </div>
      )}

      {/* ── Right: contact details panel ────────────────────────── */}
      {activeContact && showDetails && (
        <ContactDetailsPanel
          contact={activeContact}
          provider={provider}
          groups={groups}
          onClose={() => setShowDetails(false)}
          onAddToGroup={() => setShowAddToGroup(true)}
        />
      )}

      {/* ── Dialogs ─────────────────────────────────────────────── */}

      {/* Import leads */}
      {showImport && (
        <ImportLeadsDialog
          open={showImport}
          onOpenChange={setShowImport}
          onImportComplete={() => { loadContacts(); loadGroups(); }}
          channel={provider}
        />
      )}

      {/* Bulk send template to selected contacts */}
      {showBulkSend && bulkSendGroup && (
        <EmailTemplatePicker
          open={showBulkSend}
          onOpenChange={open => { setShowBulkSend(open); if (!open) exitSelectionMode(); }}
          group={bulkSendGroup}
          provider={provider}
        />
      )}

      {/* Add selected contacts to a broadcast group */}
      {showAddToGroup && (
        <AddToGroupModal
          groups={groups}
          provider={provider}
          contactIds={
            // single contact detail panel OR multi-select
            activeContact && !selectionMode
              ? [activeContact.id]
              : Array.from(selectedIds)
          }
          onDone={() => {
            setShowAddToGroup(false);
            if (selectionMode) exitSelectionMode();
            loadGroups();
          }}
          onClose={() => setShowAddToGroup(false)}
        />
      )}
    </div>
  );
}
