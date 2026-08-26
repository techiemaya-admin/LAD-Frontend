"use client";
/**
 * LinkedIn Conversation View
 *
 * Shows every lead for whom a LinkedIn connection request was sent via campaigns.
 * Data merges two sources:
 *   - campaign_analytics / campaign_leads (DB) → lead names, status, connection message
 *   - Unipile /chats (API)                    → real messages for accepted connections
 *
 * Connection lifecycle controls chat availability:
 *   pending  → awaiting acceptance          → chat disabled
 *   accepted → connected, follow-up pending → chat disabled
 *   active   → automated follow-up sent     → chat enabled
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Send, RefreshCw, Loader2, MessageSquare, Linkedin, Clock, CheckCircle, Zap, Lock, ChevronLeft, Search, MoreVertical, Trash2, X, Film, Music, FileText, Image as ImageIcon, Megaphone, Sparkles, Paperclip, UserPlus, PanelRightOpen, PanelRightClose, AlertCircle, Plus, ChevronRight } from 'lucide-react';
import LinkedInBroadcastModal from './LinkedInBroadcastModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { MessageFeedback } from './MessageFeedback';
import { cn } from '@/lib/utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { LinkedInFollowupComposer } from './LinkedInFollowupComposer';
import { LinkedInContextPanel } from './LinkedInContextPanel';
import { LinkedInChatToolbar } from './LinkedInChatToolbar';
import type { InsertTemplatePayload } from './LinkedInChatToolbar';
import { DateSeparator } from './DateSeparator';
import { isSameDay } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'pending' | 'accepted' | 'active';

interface LinkedInTemplate {
  id: string;
  name: string;
  content: string | null;
  category?: string | null;
  metadata?: {
    media_url?: string | null;
    media_type?: string | null;
    media_filename?: string | null;
  } | null;
}

export interface InsertTemplatePayload {
  text: string;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaFilename?: string | null;
}

interface LinkedInContact {
  id: string;
  name: string;
  avatar?: string | null;
  headline?: string | null;
  // Surfaced by the backend merge so the chat-toolbar template insert can
  // substitute {{company}} client-side (backend fills it as a backstop).
  company?: string | null;
}

/** A template attachment staged in the composer before send. */
interface PendingMedia {
  url: string;
  type?: string | null;
  filename?: string | null;
}

interface LinkedInConversation {
  id: string;
  channel: 'linkedin';
  status: string;
  connection_status: ConnectionStatus;
  chat_enabled: boolean;
  campaign_id: string | null;
  lead_id: string | null;
  lead_linkedin: string | null;
  unread_count: number;
  last_message: string;
  last_message_time: string;
  contact: LinkedInContact;
}

interface LinkedInMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  is_sender: boolean;
  is_virtual?: boolean;
  action_type?: string;
}

const API_BASE = '/api/whatsapp-conversations';

// Add ?channel=linkedin to any URL
function li(url: string) {
  return `${url}${url.includes('?') ? '&' : '?'}channel=linkedin`;
}

/**
 * Substitute {{var}} placeholders in a template body with the open
 * conversation's lead data, so inserting a template shows the FINAL text (not a
 * literal `{{first_name}}`). Only the vars we can resolve from the contact are
 * filled; anything else is left intact for the backend's substitution backstop
 * to fill on send (so we never guess and never clobber a value the server knows).
 */
function substituteLeadVars(text: string, contact?: LinkedInContact | null): string {
  if (!text || !contact) return text;
  const full = (contact.name || '').trim();
  const first = full.split(/\s+/)[0] || '';
  const last = full.split(/\s+/).slice(1).join(' ') || '';
  const title = (contact.headline || '').trim();
  const company = (contact.company || '').trim();

  const sub = (src: string, key: string, value: string): string =>
    value ? src.replace(new RegExp(`\\{\\{?\\s*${key}\\s*\\}\\}?`, 'gi'), value) : src;

  let out = text;
  out = sub(out, 'first_name', first);
  out = sub(out, 'last_name', last);
  out = sub(out, 'name', full);
  out = sub(out, 'title', title);
  out = sub(out, 'headline', title);
  out = sub(out, 'company(?:_name)?', company);
  return out;
}

/** Icon for a staged attachment chip, chosen from the media type / filename. */
function MediaChipIcon({ type, filename }: { type?: string | null; url?: string; filename?: string | null }) {
  const t = (type || '').toLowerCase();
  const ext = (filename || '').split('.').pop()?.toLowerCase() || '';
  const isImage = t.startsWith('image') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  const isVideo = t.startsWith('video') || ['mp4', 'mov', 'webm', 'm4v'].includes(ext);
  const isAudio = t.startsWith('audio') || ['mp3', 'm4a', 'wav', 'ogg', 'oga'].includes(ext);
  const Icon = isImage ? ImageIcon : isVideo ? Film : isAudio ? Music : FileText;
  return <Icon className="w-4 h-4 flex-shrink-0 text-blue-600" />;
}

// ─── Status badge config ──────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ConnectionStatus, {
  label: string;
  icon: React.ReactNode;
  dotClass: string;
  badgeClass: string;
  bannerText: string;
}> = {
  pending: {
    label:      'Awaiting acceptance',
    icon:       <Clock className="w-3 h-3" />,
    dotClass:   'bg-slate-300 dark:bg-slate-500',
    badgeClass: 'bg-slate-100 text-slate-500 dark:bg-slate-800/80 dark:text-slate-300',
    bannerText: 'Connection request sent - chat will be available once they accept.',
  },
  accepted: {
    label:      'Connected',
    icon:       <CheckCircle className="w-3 h-3" />,
    dotClass:   'bg-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-500',
    // Empty - chat is now unlocked immediately on acceptance. Sending any
    // message records CONTACTED on the backend, which cancels the workflow
    // scheduler's automated follow-up so there's no duplicate. The
    // FollowupComposer above the chat still offers AI/template shortcuts.
    bannerText: '',
  },
  active: {
    label:      'Active',
    icon:       <Zap className="w-3 h-3" />,
    dotClass:   'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-500',
    bannerText: '',
  },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

/**
 * Returns a same-origin URL for any external image so LinkedIn CDN
 * cross-origin restrictions don't break avatar loading.
 *
 * - Already-relative URLs (starts with `/`) pass through untouched
 * - LinkedIn CDN / Unipile / cross-origin URLs route through /api/proxy-image
 * - Empty / null returns null
 */
function toProxiedAvatarUrl(raw?: string | null): string | null {
  if (!raw) return null;
  // Local / data URLs don't need proxying
  if (raw.startsWith('/') || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }
  try {
    const u = new URL(raw);
    // LinkedIn CDN, Unipile, and any non-public host that needs server-side
    // fetch - proxy through Next.js. Allowlist enforced server-side.
    if (
      /\.licdn\.com$/.test(u.hostname) ||
      u.hostname === 'static.licdn.com' ||
      /\.linkedin\.com$/.test(u.hostname) ||
      /\.unipile\.com$/.test(u.hostname) ||
      u.hostname === 'api.unipile.com'
    ) {
      return `/api/proxy-image?url=${encodeURIComponent(raw)}`;
    }
    // Other public CDNs (e.g. Gravatar) - load directly
    return raw;
  } catch {
    return null;
  }
}

function ContactAvatar({
  contact,
  size = 'md',
}: {
  contact: LinkedInContact;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const initials = contact.name
    .split(' ')
    .map(n => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // If the upstream image fails (deleted, expired Unipile token, etc.)
  // gracefully fall back to initials instead of a broken-image icon.
  const [imgFailed, setImgFailed] = useState(false);
  const proxiedSrc = toProxiedAvatarUrl(contact.avatar);
  const showAvatar = !!proxiedSrc && !imgFailed;

  // Reset failure state when the contact (or their avatar URL) changes
  useEffect(() => { setImgFailed(false); }, [proxiedSrc]);

  if (showAvatar) {
    return (
      <img
        src={proxiedSrc!}
        alt={contact.name}
        loading="lazy"
        decoding="async"
        className={cn('rounded-full object-cover flex-shrink-0 bg-blue-100', sizeClass)}
        onError={() => setImgFailed(true)}
      />
    );
  }

  return (
    <div className={cn('rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-semibold flex-shrink-0', sizeClass)}>
      {initials || '?'}
    </div>
  );
}

// ─── Relative time ────────────────────────────────────────────────────────────

function relativeTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const diff  = Date.now() - d.getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins  < 1)  return 'just now';
    if (mins  < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days  < 7)  return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// Time-only format for message bubbles (e.g. "3:42 PM").
// Date is represented by DateSeparator chips separating message groups.
function formatBubbleTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(undefined, {
      hour:   'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

// ─── Conversation list item ───────────────────────────────────────────────────

function ConvListItem({
  conv,
  isSelected,
  onSelect,
}: {
  conv: LinkedInConversation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const cfg = STATUS_CONFIG[conv.connection_status] ?? STATUS_CONFIG.pending;
  const isPending = conv.connection_status === 'pending';

  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
        isSelected
          ? 'bg-blue-50 dark:bg-[#1A294C] border-l-2 border-blue-600 dark:border-blue-500'
          : 'hover:bg-slate-200 dark:hover:bg-[#132242] border-l-2 border-transparent',
        isPending && 'opacity-70',
      )}
    >
      {/* Avatar with status dot */}
      <div className="relative flex-shrink-0">
        <ContactAvatar contact={conv.contact} />
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#0C162F]',
            cfg.dotClass,
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + timestamp row */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            isSelected ? 'text-blue-900 dark:text-white dark:font-semibold' : 'text-slate-900 dark:text-slate-200',
          )}>
            {conv.contact.name}
          </span>
          <span className="text-xs text-slate-400 flex-shrink-0">
            {relativeTime(conv.last_message_time)}
          </span>
        </div>

        {/* Status badge + last message */}
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={cn(
            'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0',
            cfg.badgeClass,
          )}>
            {cfg.icon}
            {cfg.label}
          </span>
        </div>

        <p className={cn("text-xs truncate mt-0.5", isSelected ? "text-slate-500 dark:text-slate-300" : "text-slate-500 dark:text-slate-400")}>
          {conv.last_message || 'Connection request sent'}
        </p>
      </div>

      {conv.unread_count > 0 && (
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-semibold flex items-center justify-center">
          {conv.unread_count > 9 ? '9+' : conv.unread_count}
        </span>
      )}
    </button>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg, conversationId }: { msg: LinkedInMessage; conversationId?: string }) {
  const isOut = msg.is_sender || msg.role === 'assistant';

  // Label virtual messages differently
  const actionLabel =
    msg.is_virtual && msg.action_type
      ? msg.action_type.includes('CONNECTION')
        ? '📨 Connection request'
        : '✉️ Follow-up message'
      : null;

  return (
    <div className={cn('flex flex-col', isOut ? 'items-end' : 'items-start')}>
      {actionLabel && (
        <span className="text-[10px] text-slate-400 mb-1 px-1">{actionLabel}</span>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
          isOut
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-bl-sm',
          msg.is_virtual && 'opacity-80',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p className={cn('text-[10px] mt-1 text-right', isOut ? 'text-blue-200' : 'text-slate-400')}>
          {formatBubbleTime(msg.created_at)}
        </p>
      </div>
      {/* Only the agent's own replies are rateable — correcting the lead teaches
          nothing, and virtual rows are campaign-analytics echoes rather than real
          stored messages the agent could learn from. */}
      {msg.role === 'assistant' && !msg.is_virtual && conversationId && (
        <MessageFeedback
          channel="linkedin"
          conversationId={conversationId}
          messageId={String(msg.id)}
          content={msg.content || ''}
        />
      )}
    </div>
  );
}

// ─── Chat disabled banner ─────────────────────────────────────────────────────


function ChatDisabledBanner({ conv }: { conv: LinkedInConversation }) {
  const cfg = STATUS_CONFIG[conv.connection_status];
  if (!cfg?.bannerText) return null;

  return (
    <div className={cn(
      'flex items-start gap-2 mx-4 my-3 px-3 py-2.5 rounded-lg text-xs border',
      conv.connection_status === 'pending'
        ? 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/60 dark:text-slate-300 dark:border-slate-700/60'
        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50',
    )}>
      <Lock className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
      <span>{cfg.bannerText}</span>
    </div>
  );
}

// ─── Main view ────────────────────────────────────────────────────────────────

export function LinkedInConversationView({ 
  visibleTabs, 
  activeTab, 
  setActiveTab,
  onBack,
  isMobile: propIsMobile
}: { 
  visibleTabs?: { id: string; label: string; sublabel: string }[];
  activeTab?: string;
  setActiveTab?: (tab: any) => void;
  onBack?: () => void;
  isMobile?: boolean;
}) {
  const [conversations, setConversations] = useState<LinkedInConversation[]>([]);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [messages, setMessages]           = useState<LinkedInMessage[]>([]);
  const [searchQuery, setSearchQuery]     = useState('');
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  // Sidebar status filter - null shows everything, otherwise narrows to that status.
  // Toggled by the chips at the top of the conversation list.
  const [statusFilter, setStatusFilter]   = useState<ConnectionStatus | null>(null);
  // Right-side Contact Details panel - open by default on wide desktops.
  const [contextPanelOpen, setContextPanelOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth >= 1280;
  });
  const [messageText, setMessageText]     = useState('');
  // Attachment staged from a template insert, shown as a removable composer chip.
  const [pendingMedia, setPendingMedia]   = useState<PendingMedia | null>(null);
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [msgError, setMsgError]           = useState<string | null>(null);
  // Delete-conversation confirm flow: the conversation pending deletion (null = closed).
  const [deleteTarget, setDeleteTarget]   = useState<LinkedInConversation | null>(null);
  const [deleting, setDeleting]           = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // ── AI Chat Agent toggle ────────────────────────────────────────────────
  const [agentEnabled, setAgentEnabled] = useState<boolean | null>(null);
  const [agentSaving, setAgentSaving] = useState(false);

  useEffect(() => {
    fetch('/api/social-integration/linkedin/automation-settings')
      .then(r => r.json())
      .then(d => setAgentEnabled(d?.success ? !!d.data?.ai_agent_enabled : false))
      .catch(() => setAgentEnabled(false));
  }, []);

  const toggleAgent = async () => {
    if (agentEnabled === null) return;
    const next = !agentEnabled;
    setAgentSaving(true);
    setAgentEnabled(next);
    try {
      const cur = await fetch('/api/social-integration/linkedin/automation-settings').then(r => r.json()).catch(() => ({}));
      const data = cur?.data || {};
      await fetch('/api/social-integration/linkedin/automation-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auto_like_posts:    !!data.auto_like_posts,
          auto_comment_posts: !!data.auto_comment_posts,
          ai_agent_enabled:   next,
        }),
      });
    } catch {
      setAgentEnabled(!next);
    } finally {
      setAgentSaving(false);
    }
  };

  // ── Templates ───────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState<LinkedInTemplate[]>([]);
  const [tplLoading, setTplLoading] = useState(false);
  const [tplLoaded, setTplLoaded] = useState(false);
  const [tplSearchQuery, setTplSearchQuery] = useState('');

  const loadTemplates = useCallback(async () => {
    if (tplLoaded) return;
    setTplLoading(true);
    try {
      const resp = await fetch('/api/campaigns/linkedin-message-templates');
      const data = await resp.json().catch(() => ({}));
      const list = data?.data || data?.templates || [];
      setTemplates(Array.isArray(list) ? list : []);
    } catch { /* non-fatal */ } finally {
      setTplLoaded(true);
      setTplLoading(false);
    }
  }, [tplLoaded]);

  const filteredTemplates = useMemo(() => {
    return templates.filter(t => {
      if (!tplSearchQuery.trim()) return true;
      const q = tplSearchQuery.toLowerCase().trim();
      const nameMatch = t.name?.toLowerCase().includes(q);
      const contentMatch = t.content?.toLowerCase().includes(q);
      const mediaMatch = t.metadata?.media_filename?.toLowerCase().includes(q);
      const categoryMatch = t.category?.toLowerCase().includes(q);
      return nameMatch || contentMatch || mediaMatch || categoryMatch;
    });
  }, [templates, tplSearchQuery]);

  // ── Attach media ─────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachInfo, setAttachInfo] = useState<string | null>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChosen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachInfo(`Selected "${file.name}" - media upload to LinkedIn DMs is queued for the next backend release.`);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setTimeout(() => setAttachInfo(null), 6000);
  };
  // Group messages by date and interleave DateSeparator items
  const messagesWithDateSeparators = useMemo(() => {
    const items: Array<
      | { type: 'date'; date: Date; key: string }
      | { type: 'message'; msg: LinkedInMessage; key: string }
    > = [];
    let lastDate: Date | null = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at);
      const isValidDate = !isNaN(msgDate.getTime());

      if (isValidDate && (!lastDate || !isSameDay(lastDate, msgDate))) {
        items.push({
          type: 'date',
          date: msgDate,
          key: `date-${msgDate.toISOString()}-${msg.id}`,
        });
        lastDate = msgDate;
      }
      items.push({
        type: 'message',
        msg,
        key: msg.id,
      });
    });

    return items;
  }, [messages]);

  const [isSmallMobile, setIsSmallMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < 640;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsSmallMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobileView = propIsMobile ?? isSmallMobile;
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  // ── Load conversations ─────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingConvs(true);
    setError(null);
    try {
      const res  = await fetchWithTenant(li(`${API_BASE}/conversations`));
      const json = await res.json();
      if (json.success) {
        setConversations(json.data || []);
      } else {
        setError(json.message || json.error || 'Failed to load LinkedIn conversations');
      }
    } catch {
      setError('Could not reach the LinkedIn conversations service. Please try again.');
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Delete an entire conversation thread ───────────────────────────────────
  // Removes the thread on LinkedIn (Unipile) AND soft-deletes our local record
  // via DELETE /api/linkedin-conversations/conversations/:id (:id = Unipile chat
  // id = LinkedInConversation.id). Routed through the shared conversations proxy
  // with ?channel=linkedin.
  const handleDeleteConversation = useCallback(async () => {
    if (!deleteTarget) return;
    const conv = deleteTarget;
    setDeleting(true);
    try {
      const res = await fetchWithTenant(
        li(`${API_BASE}/conversations/${conv.id}`),
        { method: 'DELETE' }
      );
      const json = await res.json().catch(() => ({} as any));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.message || json?.error || 'Failed to delete conversation');
      }
      toast({
        title: 'Conversation deleted',
        description: `${conv.contact?.name || 'The thread'} was removed from LinkedIn and your inbox.`,
      });
      setDeleteTarget(null);
      // Close the open thread if it was the one we just deleted.
      if (selectedId === conv.id) {
        setSelectedId(null);
        setMessages([]);
      }
      await loadConversations();
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Could not delete conversation',
        description: e?.message || 'Please try again.',
      });
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget, selectedId, loadConversations, toast]);

  // ── Load messages for selected conversation ────────────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    setMsgError(null);
    try {
      const res  = await fetchWithTenant(li(`${API_BASE}/conversations/${convId}/messages`));
      const json = await res.json();
      if (json.success) {
        const sorted = [...(json.data || [])].sort(
          (a: LinkedInMessage, b: LinkedInMessage) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sorted);
      } else {
        setMsgError(json.error || 'Failed to load messages');
      }
    } catch {
      setMsgError('Could not load messages.');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    // Drop any staged attachment when switching threads so it can't ride into
    // the wrong conversation.
    setPendingMedia(null);
    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    // A media-only send (attachment, no text) is valid.
    if (!selectedId || (!messageText.trim() && !pendingMedia) || sending) return;
    const selectedConv = conversations.find(c => c.id === selectedId);
    if (!selectedConv?.chat_enabled) return;

    const text = messageText.trim();
    const media = pendingMedia;
    setMessageText('');
    setPendingMedia(null);
    setSending(true);

    const tempMsg: LinkedInMessage = {
      id:         `temp-${Date.now()}`,
      role:       'assistant',
      // Show something for a media-only optimistic bubble so it isn't blank.
      content:    text || `📎 ${media?.filename || 'Attachment'}`,
      created_at: new Date().toISOString(),
      is_sender:  true,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      // Pass campaign_id + lead_id when known so the backend can record
      // CONTACTED in campaign_analytics on a successful send. That marker
      // cancels the workflow scheduler's automated follow-up so the lead
      // never gets a duplicate auto-message after the user has already
      // engaged in chat manually. Media (from a template) rides along as
      // media_url/type/filename - the backend re-downloads the bytes and
      // sends a real LinkedIn attachment.
      const res  = await fetchWithTenant(li(`${API_BASE}/conversations/${selectedId}/messages`), {
        method: 'POST',
        body:   JSON.stringify({
          content: text,
          campaign_id: selectedConv.campaign_id || undefined,
          lead_id:     selectedConv.lead_id     || undefined,
          media_url:      media?.url      || undefined,
          media_type:     media?.type     || undefined,
          media_filename: media?.filename || undefined,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMessages(prev =>
          prev.map(m => m.id === tempMsg.id ? { ...json.data, is_sender: true } : m)
        );
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedId
              ? { ...c, last_message: text || `📎 ${media?.filename || 'Attachment'}`, last_message_time: new Date().toISOString() }
              : c
          )
        );
      } else {
        // Non-success response - drop the optimistic bubble and restore the draft.
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setMessageText(text);
        if (media) setPendingMedia(media);
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setMessageText(text);
      if (media) setPendingMedia(media);
    } finally {
      setSending(false);
    }
  }, [selectedId, messageText, pendingMedia, sending, conversations]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ── Derived values ─────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter(c => {
    // Status filter (chip-driven). null = all.
    if (statusFilter && c.connection_status !== statusFilter) return false;
    // Search-string filter
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.contact.name.toLowerCase().includes(q) ||
      (c.last_message || '').toLowerCase().includes(q)
    );
  });

  const selectedConv = conversations.find(c => c.id === selectedId) ?? null;
  const chatEnabled  = selectedConv?.chat_enabled ?? false;

  // Count by status for header
  const pendingCount  = conversations.filter(c => c.connection_status === 'pending').length;
  const acceptedCount = conversations.filter(c => c.connection_status === 'accepted').length;
  const activeCount   = conversations.filter(c => c.connection_status === 'active').length;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 h-full overflow-hidden">

      {/* ── Left sidebar ─────────────────────────────────────────────────── */}
      <div className={cn(
        "w-full lg:w-[340px] flex-shrink-0 flex flex-col border-r border-border dark:border-slate-800 bg-card dark:bg-[#0C162F] transition-all",
        isMobile && selectedId ? "hidden" : "flex"
      )}>


        {/* Header */}
        <div className="flex items-center gap-2 px-4 md:px-4 py-2 md:py-3 border-b border-border dark:border-slate-800 bg-card dark:bg-[#0C162F]">
          <div className="flex items-center gap-1.5 md:gap-2 mr-1 md:mr-2">
            <Linkedin className="w-3.5 h-3.5 md:w-4 md:h-4 text-blue-600 dark:text-blue-500" />
            <span className="font-semibold text-xs md:text-sm text-slate-800 dark:text-white whitespace-nowrap">LinkedIn</span>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-2.5 md:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 md:h-4 md:w-4 text-muted-foreground dark:text-slate-400" />
            <Input
              placeholder="Search"
              className="pl-8 md:pl-9 h-8 md:h-9 text-xs md:text-sm bg-secondary/50 dark:bg-slate-900/90 border border-transparent dark:border-slate-800/80 text-slate-900 dark:text-white placeholder:text-muted-foreground dark:placeholder:text-slate-400 shadow-none focus-visible:ring-1"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:h-8 md:w-8 rounded-full flex-shrink-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
            onClick={() => setBroadcastOpen(true)}
            title="New Broadcast"
          >
            <Megaphone className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 md:h-8 md:w-8 rounded-full flex-shrink-0 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
            onClick={loadConversations}
            disabled={loadingConvs}
            title="Refresh"
          >
            <RefreshCw className={cn('h-3 w-3 md:h-3.5 md:w-3.5', loadingConvs && 'animate-spin')} />
          </Button>
        </div>

        {broadcastOpen && <LinkedInBroadcastModal onClose={() => setBroadcastOpen(false)} />}

        {/* Status summary pills - clickable: tap to filter the list to that status,
            tap the same chip again (or "All") to clear the filter. */}
        {conversations.length > 0 && (
          <div className="flex gap-1.5 px-3 py-2 border-b border-border dark:border-slate-800 overflow-x-auto">
            {/* All */}
            <button
              type="button"
              onClick={() => setStatusFilter(null)}
              className={cn(
                'flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors',
                statusFilter === null
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80'
              )}
              title="Show all conversations"
            >
              All
            </button>

            {pendingCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(prev => prev === 'pending' ? null : 'pending')}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all',
                  statusFilter === 'pending'
                    ? 'bg-slate-600 text-white shadow-sm ring-2 ring-slate-300 ring-offset-1'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700/80 cursor-pointer'
                )}
                title={statusFilter === 'pending' ? 'Click to clear filter' : 'Show only pending requests'}
              >
                <Clock className="w-2.5 h-2.5" />{pendingCount} pending
              </button>
            )}
            {acceptedCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(prev => prev === 'accepted' ? null : 'accepted')}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all',
                  statusFilter === 'accepted'
                    ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-300 ring-offset-1'
                    : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 border border-transparent dark:border-amber-800/40 cursor-pointer'
                )}
                title={statusFilter === 'accepted' ? 'Click to clear filter' : 'Show only connected (awaiting follow-up)'}
              >
                <CheckCircle className="w-2.5 h-2.5" />{acceptedCount} connected
              </button>
            )}
            {activeCount > 0 && (
              <button
                type="button"
                onClick={() => setStatusFilter(prev => prev === 'active' ? null : 'active')}
                className={cn(
                  'flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all',
                  statusFilter === 'active'
                    ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300 ring-offset-1'
                    : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/50 border border-transparent dark:border-emerald-800/40 cursor-pointer'
                )}
                title={statusFilter === 'active' ? 'Click to clear filter' : 'Show only active conversations'}
              >
                <Zap className="w-2.5 h-2.5" />{activeCount} active
              </button>
            )}
          </div>
        )}


        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Loading…</span>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-red-500 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={loadConversations}>Retry</Button>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 px-4 text-center">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">No conversations found</p>
              <p className="text-xs mt-1 text-slate-400">
                {conversations.length === 0
                  ? 'LinkedIn campaign conversations will appear here once connection requests are sent.'
                  : statusFilter
                    ? `No ${statusFilter === 'accepted' ? 'connected' : statusFilter} conversations${searchQuery ? ' match your search' : ''}.`
                    : 'Try a different search.'}
              </p>
              {statusFilter && (
                <button
                  type="button"
                  onClick={() => setStatusFilter(null)}
                  className="mt-3 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Clear filter
                </button>
              )}
            </div>
          ) : (
            filteredConvs.map(conv => (
              <ConvListItem
                key={conv.id}
                conv={conv}
                isSelected={conv.id === selectedId}
                onSelect={() => setSelectedId(conv.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: chat + (optional) context details panel ──────────── */}
      <div className={cn(
        "flex-1 flex flex-row overflow-hidden bg-background",
        isMobile && !selectedId ? "hidden" : "flex"
      )}>
        <div className={cn(
          "flex-1 flex flex-col overflow-hidden",
        )}>
        {!selectedConv ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Linkedin className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-base font-medium text-slate-500">Select a conversation</p>
            <p className="text-sm mt-1">Choose a LinkedIn lead from the left panel</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-3 py-3 md:px-5 md:py-3.5 border-b border-border dark:border-slate-800 bg-card dark:bg-[#101C36]">
              {isMobile && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 -ml-1" 
                  onClick={() => setSelectedId(null)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              )}
              <ContactAvatar contact={selectedConv.contact} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                    {selectedConv.contact.name}
                  </p>
                  {/* Status badge in header */}
                  {(() => {
                    const cfg = STATUS_CONFIG[selectedConv.connection_status];
                    return (
                      <span className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium flex-shrink-0',
                        cfg.badgeClass,
                      )}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                    );
                  })()}
                </div>
                {selectedConv.contact.headline && (
                  <p className="text-xs text-slate-500 truncate max-w-sm">
                    {selectedConv.contact.headline}
                  </p>
                )}
                {selectedConv.lead_linkedin && (
                  <a
                    href={selectedConv.lead_linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-blue-500 hover:underline truncate block"
                  >
                    {selectedConv.lead_linkedin}
                  </a>
                )}
              </div>

              {/* Conversation actions (delete thread) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-slate-500"
                    title="Conversation options"
                  >
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setContextPanelOpen(o => !o)}
                    className="cursor-pointer"
                  >
                    {contextPanelOpen ? (
                      <PanelRightClose className="h-4 w-4 mr-2" />
                    ) : (
                      <PanelRightOpen className="h-4 w-4 mr-2" />
                    )}
                    {contextPanelOpen ? 'Hide contact details' : 'Show contact details'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(selectedConv)}
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete conversation
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Disabled banner (shown for pending/accepted) */}
            {!chatEnabled && <ChatDisabledBanner conv={selectedConv} />}

            {/* Manual follow-up composer - only when the connection is accepted
                and the conversation maps to a real campaign lead. Lets the user
                send the follow-up themselves (AI or template) instead of waiting
                for the automated cycle. Once sent, the chat unlocks. */}
            {selectedConv.connection_status === 'accepted' &&
              selectedConv.campaign_id &&
              selectedConv.lead_id && (
                <LinkedInFollowupComposer
                  campaignId={selectedConv.campaign_id}
                  leadId={selectedConv.lead_id}
                  contactName={selectedConv.contact?.name}
                  onSent={() => {
                    // Reload conversations + messages so the chat-unlock state
                    // and new outbound message both surface immediately.
                    loadConversations();
                    if (selectedId) loadMessages(selectedId);
                  }}
                />
              )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {loadingMsgs ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  <span className="text-sm">Loading messages…</span>
                </div>
              ) : msgError ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <p className="text-sm text-red-400">{msgError}</p>
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => loadMessages(selectedId!)}>
                    Retry
                  </Button>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
                  {selectedConv.connection_status === 'pending' ? (
                    <>
                      <Clock className="w-8 h-8 opacity-30" />
                      <p className="font-medium text-slate-500">Connection request sent</p>
                      <p className="text-xs text-center max-w-xs">
                        Waiting for {selectedConv.contact.name} to accept. The message preview will appear once they respond.
                      </p>
                    </>
                  ) : (
                    <p>No messages yet - start the conversation!</p>
                  )}
                </div>
              ) : (
                messagesWithDateSeparators.map((item) =>
                  item.type === 'date' ? (
                    <DateSeparator key={item.key} date={item.date} variant="linkedin" />
                  ) : (
                    <MessageBubble key={item.key} msg={item.msg} conversationId={selectedConv?.id} />
                  )
                )
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <TooltipProvider>
              <div className={cn(
                'px-4 py-3 border-t border-border dark:border-slate-800 bg-card dark:bg-[#101C36]',
                !chatEnabled && 'opacity-60',
              )}>
                {/* Hidden file input for Attach media */}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={handleFileChosen}
                />

                {!chatEnabled && (
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-slate-400">
                    <Lock className="w-3 h-3" />
                    <span>
                      {selectedConv.connection_status === 'pending'
                        ? 'Chat unlocks after connection is accepted and follow-up is sent'
                        : 'Chat unlocks after the automated follow-up is sent'}
                    </span>
                  </div>
                )}
                {/* Staged attachment from a template - removable before send */}
                {pendingMedia && (
                  <div className="mb-2 inline-flex items-center gap-2 max-w-full rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 dark:bg-blue-950/40 dark:border-blue-800">
                    <MediaChipIcon type={pendingMedia.type} url={pendingMedia.url} filename={pendingMedia.filename} />
                    <span className="text-xs text-slate-700 dark:text-slate-200 truncate max-w-[220px]">
                      {pendingMedia.filename || 'Attachment'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPendingMedia(null)}
                      className="flex-shrink-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title="Remove attachment"
                      aria-label="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {/* Plus button dropdown menu (Attach, Templates, Assign) */}
                  <DropdownMenu onOpenChange={(open) => {
                    if (open) {
                      loadTemplates();
                      setTplSearchQuery('');
                    }
                  }}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="flex-shrink-0 h-10 w-10 p-0 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800"
                            disabled={!chatEnabled}
                          >
                            <Plus className="h-5 w-5" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top">Actions (Attach, Templates, Assign)</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="start" side="top" className="w-56 p-1.5 bg-white dark:bg-[#091122] border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl text-slate-900 dark:text-slate-100">
                      {/* Attach Media */}
                      <DropdownMenuItem
                        onClick={handleAttachClick}
                        disabled={!chatEnabled}
                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer font-medium"
                      >
                        <Paperclip className="w-4 h-4 text-slate-500" />
                        <span>Attach media (image / PDF)</span>
                      </DropdownMenuItem>

                      {/* Templates Submenu */}
                      <DropdownMenuSub onOpenChange={(open) => {
                        if (open) {
                          loadTemplates();
                          setTplSearchQuery('');
                        }
                      }}>
                        <DropdownMenuSubTrigger
                          disabled={!chatEnabled}
                          className="flex items-center justify-between gap-2 px-2.5 py-2 text-xs rounded-lg cursor-pointer font-medium hover:bg-slate-100 dark:hover:bg-slate-800/60"
                        >
                          <div className="flex items-center gap-2.5">
                            <FileText className="w-4 h-4 text-slate-500" />
                            <span>Templates</span>
                          </div>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                        </DropdownMenuSubTrigger>

                        <DropdownMenuSubContent className="w-72 p-2 bg-white dark:bg-[#091122] border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl text-slate-900 dark:text-slate-100">
                          {/* Header */}
                          <div className="px-2 py-1 flex items-center justify-between">
                            <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-800 dark:text-slate-100">
                              <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>LinkedIn templates</span>
                            </div>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
                              {templates.length}
                            </span>
                          </div>

                          {/* Search Bar */}
                          <div className="relative my-1 px-0.5" onClick={(e) => e.stopPropagation()}>
                            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" />
                            <input
                              type="text"
                              placeholder="Search templates..."
                              value={tplSearchQuery}
                              onChange={(e) => setTplSearchQuery(e.target.value)}
                              onKeyDown={(e) => {
                                e.stopPropagation();
                                if (e.key === 'Escape') e.currentTarget.blur();
                              }}
                              onPointerDown={(e) => e.stopPropagation()}
                              className="w-full pl-8 pr-7 py-1 text-xs rounded-lg bg-slate-50 dark:bg-[#0D1527] border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            {tplSearchQuery && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTplSearchQuery('');
                                }}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* Template List */}
                          <div className="max-h-[200px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 mt-1">
                            {tplLoading && (
                              <div className="flex items-center justify-center py-4 text-xs text-slate-500">
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> Loading…
                              </div>
                            )}
                            {!tplLoading && templates.length === 0 && (
                              <div className="py-4 text-center text-xs text-slate-500">
                                No templates configured
                              </div>
                            )}
                            {!tplLoading && templates.length > 0 && filteredTemplates.length === 0 && (
                              <div className="py-4 text-center text-xs text-slate-500">
                                No templates match your search
                              </div>
                            )}
                            {filteredTemplates.map(t => {
                              const media = t.metadata || {};
                              const hasMedia = !!media.media_url;
                              return (
                                <DropdownMenuItem
                                  key={t.id}
                                  className="flex items-center justify-between gap-2 px-2 py-2 text-xs cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-md outline-none"
                                  onClick={() => {
                                    const resolved = substituteLeadVars(t.content || '', selectedConv?.contact);
                                    if (resolved) {
                                      setMessageText(prev => prev ? `${prev}\n${resolved}` : resolved);
                                    }
                                    if (media.media_url) {
                                      setPendingMedia({
                                        url: media.media_url,
                                        type: media.media_type ?? null,
                                        filename: media.media_filename ?? null,
                                      });
                                    }
                                  }}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-slate-800 dark:text-slate-100 truncate text-[11px]">
                                      {t.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                      {t.content || (hasMedia ? (media.media_filename || 'Attachment') : '')}
                                    </div>
                                  </div>
                                  {hasMedia && <Paperclip className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />}
                                </DropdownMenuItem>
                              );
                            })}
                          </div>
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Assign to team member */}
                      <DropdownMenuItem
                        onClick={() => alert('Assignment for LinkedIn is queued for the next backend release.')}
                        disabled={!chatEnabled}
                        className="flex items-center gap-2.5 px-2.5 py-2 text-xs rounded-lg cursor-pointer font-medium"
                      >
                        <UserPlus className="w-4 h-4 text-slate-500" />
                        <span>Assign to team member</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {/* Textarea */}
                  <textarea
                    className={cn(
                      'flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-snug placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[40px] max-h-[120px]',
                      !chatEnabled && 'cursor-not-allowed',
                    )}
                    placeholder={
                      chatEnabled
                        ? (isMobileView ? 'Type a message…' : 'Type a message… (Enter to send, Shift+Enter for newline)')
                        : (isMobileView ? 'Chat unavailable' : 'Chat unavailable - waiting for connection acceptance')
                    }
                    rows={1}
                    value={messageText}
                    onChange={e => { if (chatEnabled) setMessageText(e.target.value); }}
                    onKeyDown={chatEnabled ? handleKeyDown : undefined}
                    disabled={!chatEnabled || sending}
                    readOnly={!chatEnabled}
                  />

                  {/* AI Agent toggle button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={toggleAgent}
                        disabled={agentEnabled === null || agentSaving || !chatEnabled}
                        className={cn(
                          'flex-shrink-0 h-10 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium transition-colors shadow-2xs border',
                          isMobileView ? 'w-10 p-0' : 'px-3',
                          agentEnabled
                            ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700',
                          (agentSaving || !chatEnabled) && 'opacity-60 cursor-not-allowed'
                        )}
                      >
                        {agentSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        {!isMobileView && (
                          <span>AI {agentEnabled ? 'on' : 'off'}</span>
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {agentEnabled
                        ? 'AI auto-replies are ON - click to turn off'
                        : 'AI auto-replies are OFF - click to turn on'}
                    </TooltipContent>
                  </Tooltip>

                  {/* Send button */}
                  <Button
                    className={cn(
                      'flex-shrink-0 h-10 w-10 p-0 rounded-xl',
                      chatEnabled
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed',
                    )}
                    onClick={chatEnabled ? handleSend : undefined}
                    disabled={!chatEnabled || (!messageText.trim() && !pendingMedia) || sending}
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Inline status info (e.g. attach feedback) */}
                {attachInfo && (
                  <div className="mt-2 flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 rounded-lg border border-amber-200 dark:border-amber-800/40">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{attachInfo}</span>
                  </div>
                )}
              </div>
            </TooltipProvider>
          </>
        )}
        </div>

        {/* Right-side Contact Details panel - only when a conversation is open */}
        {selectedConv && contextPanelOpen && (
          <LinkedInContextPanel
            conversation={{
              id:                selectedConv.id,
              connection_status: selectedConv.connection_status,
              campaign_id:       selectedConv.campaign_id,
              lead_id:           selectedConv.lead_id,
              lead_linkedin:     selectedConv.lead_linkedin,
              contact:           selectedConv.contact,
              unread_count:      selectedConv.unread_count,
              last_message_time: selectedConv.last_message_time,
            }}
            onClose={() => setContextPanelOpen(false)}
          />
        )}
      </div>

      {/* Delete-conversation confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o && !deleting) setDeleteTarget(null); }}
      >
        <AlertDialogContent className="sm:max-w-md sm:w-full">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the entire thread with{' '}
              <span className="font-medium text-foreground">{deleteTarget?.contact?.name || 'this lead'}</span>{' '}
              on LinkedIn and removes it from your inbox. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={deleting} onClick={handleDeleteConversation}>
              {deleting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Deleting…</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-2" /> Delete conversation</>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
