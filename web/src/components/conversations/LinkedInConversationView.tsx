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
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, RefreshCw, Loader2, MessageSquare, Linkedin, Clock, CheckCircle, Zap, Lock, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

// ─── Types ────────────────────────────────────────────────────────────────────

type ConnectionStatus = 'pending' | 'accepted' | 'active';

interface LinkedInContact {
  id: string;
  name: string;
  avatar?: string | null;
  headline?: string | null;
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
    dotClass:   'bg-slate-300',
    badgeClass: 'bg-slate-100 text-slate-500',
    bannerText: 'Connection request sent — chat will be available once they accept.',
  },
  accepted: {
    label:      'Connected',
    icon:       <CheckCircle className="w-3 h-3" />,
    dotClass:   'bg-amber-400',
    badgeClass: 'bg-amber-50 text-amber-700',
    bannerText: 'Connection accepted! Chat will be enabled after the automated follow-up is sent.',
  },
  active: {
    label:      'Active',
    icon:       <Zap className="w-3 h-3" />,
    dotClass:   'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700',
    bannerText: '',
  },
};

// ─── Avatar ───────────────────────────────────────────────────────────────────

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

  // LinkedIn CDN images (media.licdn.com) are blocked cross-origin and return 403/404.
  // Skip the <img> entirely for those URLs — show initials instead to avoid console errors.
  const isLinkedInCdn = contact.avatar?.includes('media.licdn.com');
  const showAvatar = contact.avatar && !isLinkedInCdn;

  if (showAvatar) {
    return (
      <img
        src={contact.avatar!}
        alt={contact.name}
        className={cn('rounded-full object-cover flex-shrink-0', sizeClass)}
        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
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
          ? 'bg-blue-50 border-l-2 border-blue-600'
          : 'hover:bg-slate-50 border-l-2 border-transparent',
        isPending && 'opacity-70',
      )}
    >
      {/* Avatar with status dot */}
      <div className="relative flex-shrink-0">
        <ContactAvatar contact={conv.contact} />
        <span
          className={cn(
            'absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white',
            cfg.dotClass,
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        {/* Name + timestamp row */}
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            'text-sm font-medium truncate',
            isSelected ? 'text-blue-900' : 'text-slate-900',
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

        <p className="text-xs text-slate-500 truncate mt-0.5">
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

function MessageBubble({ msg }: { msg: LinkedInMessage }) {
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
            : 'bg-slate-100 text-slate-900 rounded-bl-sm',
          msg.is_virtual && 'opacity-80',
        )}
      >
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <p className={cn('text-[10px] mt-1 text-right', isOut ? 'text-blue-200' : 'text-slate-400')}>
          {relativeTime(msg.created_at)}
        </p>
      </div>
    </div>
  );
}

// ─── Chat disabled banner ─────────────────────────────────────────────────────


function ChatDisabledBanner({ conv }: { conv: LinkedInConversation }) {
  const cfg = STATUS_CONFIG[conv.connection_status];
  if (!cfg?.bannerText) return null;

  return (
    <div className={cn(
      'flex items-start gap-2 mx-4 my-3 px-3 py-2.5 rounded-lg text-xs',
      conv.connection_status === 'pending'
        ? 'bg-slate-50 text-slate-600 border border-slate-200'
        : 'bg-amber-50 text-amber-700 border border-amber-200',
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
  const [messageText, setMessageText]     = useState('');
  const [loadingConvs, setLoadingConvs]   = useState(true);
  const [loadingMsgs, setLoadingMsgs]     = useState(false);
  const [sending, setSending]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [msgError, setMsgError]           = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    if (!selectedId || !messageText.trim() || sending) return;
    const selectedConv = conversations.find(c => c.id === selectedId);
    if (!selectedConv?.chat_enabled) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    const tempMsg: LinkedInMessage = {
      id:         `temp-${Date.now()}`,
      role:       'assistant',
      content:    text,
      created_at: new Date().toISOString(),
      is_sender:  true,
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res  = await fetchWithTenant(li(`${API_BASE}/conversations/${selectedId}/messages`), {
        method: 'POST',
        body:   JSON.stringify({ content: text }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setMessages(prev =>
          prev.map(m => m.id === tempMsg.id ? { ...json.data, is_sender: true } : m)
        );
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedId
              ? { ...c, last_message: text, last_message_time: new Date().toISOString() }
              : c
          )
        );
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setSending(false);
    }
  }, [selectedId, messageText, sending, conversations]);

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
  const filteredConvs = conversations.filter(c =>
    !searchQuery ||
    c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.last_message || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        "w-full lg:w-[340px] flex-shrink-0 flex flex-col border-r border-border bg-card transition-all",
        isMobile && selectedId ? "hidden" : "flex"
      )}>


        {/* Header - hidden on mobile as parent provides account tabs */}
        <div className="hidden lg:flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Linkedin className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-sm text-slate-800">LinkedIn</span>
            {conversations.length > 0 && (
              <span className="text-xs text-slate-400">({conversations.length})</span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={loadConversations}
            disabled={loadingConvs}
          >
            <RefreshCw className={cn('h-3.5 w-3.5', loadingConvs && 'animate-spin')} />
          </Button>
        </div>

        {/* Status summary pills */}
        {conversations.length > 0 && (
          <div className="flex gap-1.5 px-3 py-2 border-b border-border overflow-x-auto">
            {pendingCount > 0 && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-medium">
                <Clock className="w-2.5 h-2.5" />{pendingCount} pending
              </span>
            )}
            {acceptedCount > 0 && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium">
                <CheckCircle className="w-2.5 h-2.5" />{acceptedCount} connected
              </span>
            )}
            {activeCount > 0 && (
              <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-medium">
                <Zap className="w-2.5 h-2.5" />{activeCount} active
              </span>
            )}
          </div>
        )}

        {/* Search */}
        <div className="px-3 py-2 border-b border-border">
          <Input
            placeholder="Search conversations…"
            className="h-8 text-xs"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

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
                  : 'Try a different search.'}
              </p>
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

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className={cn(
        "flex-1 flex flex-col overflow-hidden bg-background",
        isMobile && !selectedId ? "hidden" : "flex"
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
            <div className="flex items-center gap-3 px-3 py-3 md:px-5 md:py-3.5 border-b border-border bg-card">
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
                  <p className="font-semibold text-sm text-slate-900 truncate">
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
            </div>

            {/* Disabled banner (shown for pending/accepted) */}
            {!chatEnabled && <ChatDisabledBanner conv={selectedConv} />}

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
                    <p>No messages yet — start the conversation!</p>
                  )}
                </div>
              ) : (
                messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className={cn(
              'px-4 py-3 border-t border-border bg-card',
              !chatEnabled && 'opacity-60',
            )}>
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
              <div className="flex items-end gap-2">
                <textarea
                  className={cn(
                    'flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-snug placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[40px] max-h-[120px]',
                    !chatEnabled && 'cursor-not-allowed bg-slate-50',
                  )}
                  placeholder={
                    chatEnabled
                      ? 'Type a message… (Enter to send, Shift+Enter for newline)'
                      : 'Chat unavailable — waiting for connection acceptance'
                  }
                  rows={1}
                  value={messageText}
                  onChange={e => { if (chatEnabled) setMessageText(e.target.value); }}
                  onKeyDown={chatEnabled ? handleKeyDown : undefined}
                  disabled={!chatEnabled || sending}
                  readOnly={!chatEnabled}
                />
                <Button
                  className={cn(
                    'flex-shrink-0 h-10 w-10 p-0 rounded-xl',
                    chatEnabled
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed',
                  )}
                  onClick={chatEnabled ? handleSend : undefined}
                  disabled={!chatEnabled || !messageText.trim() || sending}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
