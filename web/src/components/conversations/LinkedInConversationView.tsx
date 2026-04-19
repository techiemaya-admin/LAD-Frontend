"use client";
/**
 * LinkedIn Conversation View
 *
 * Self-contained LinkedIn inbox — fetches conversations and messages directly
 * from /api/whatsapp-conversations (channel=linkedin) which the proxy routes to
 * LAD_backend's /api/linkedin-conversations/ endpoint (Unipile LinkedIn chats).
 *
 * The component is intentionally independent of the SDK's useConversations hook
 * because the SDK only supports 'personal' | 'waba' as backend channels.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, RefreshCw, Loader2, MessageSquare, Linkedin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

const API_BASE = '/api/whatsapp-conversations';

// ─── Helper: add ?channel=linkedin ───────────────────────────────────────────
function li(url: string) {
  return `${url}${url.includes('?') ? '&' : '?'}channel=linkedin`;
}

// ─── Avatar fallback ──────────────────────────────────────────────────────────
function ContactAvatar({ contact }: { contact: LinkedInContact }) {
  const initials = contact.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (contact.avatar) {
    return (
      <img
        src={contact.avatar}
        alt={contact.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }

  return (
    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-semibold flex-shrink-0">
      {initials || '?'}
    </div>
  );
}

// ─── Format relative time ─────────────────────────────────────────────────────
function relativeTime(isoString: string): string {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const diff = Date.now() - d.getTime();
    const mins  = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days  = Math.floor(diff / 86_400_000);
    if (mins < 1)   return 'just now';
    if (mins < 60)  return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7)   return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ─── Conversation List Item ───────────────────────────────────────────────────
function ConvListItem({
  conv,
  isSelected,
  onSelect,
}: {
  conv: LinkedInConversation;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
        isSelected
          ? 'bg-blue-50 border-l-2 border-blue-600'
          : 'hover:bg-slate-50 border-l-2 border-transparent',
      )}
    >
      <ContactAvatar contact={conv.contact} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm font-medium truncate', isSelected ? 'text-blue-900' : 'text-slate-900')}>
            {conv.contact.name}
          </span>
          <span className="text-xs text-slate-400 flex-shrink-0">
            {relativeTime(conv.last_message_time)}
          </span>
        </div>
        <p className="text-xs text-slate-500 truncate mt-0.5">
          {conv.last_message || 'No messages yet'}
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

// ─── Message Bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }: { msg: LinkedInMessage }) {
  const isOut = msg.is_sender || msg.role === 'assistant';
  return (
    <div className={cn('flex', isOut ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm',
          isOut
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-slate-100 text-slate-900 rounded-bl-sm',
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

// ─── Main View ────────────────────────────────────────────────────────────────

export function LinkedInConversationView() {
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

  // ── Fetch conversations ────────────────────────────────────────────────────
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
    } catch (err: any) {
      setError('Could not reach the LinkedIn conversations service. Please try again.');
    } finally {
      setLoadingConvs(false);
    }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  // ── Fetch messages for selected conversation ───────────────────────────────
  const loadMessages = useCallback(async (convId: string) => {
    setLoadingMsgs(true);
    setMsgError(null);
    try {
      const res  = await fetchWithTenant(li(`${API_BASE}/conversations/${convId}/messages`));
      const json = await res.json();
      if (json.success) {
        // Sort oldest-first so newest appears at bottom
        const sorted = [...(json.data || [])].sort(
          (a: LinkedInMessage, b: LinkedInMessage) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        setMessages(sorted);
      } else {
        setMsgError(json.error || 'Failed to load messages');
      }
    } catch (err: any) {
      setMsgError('Could not load messages.');
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  // Re-fetch messages when selection changes
  useEffect(() => {
    if (selectedId) {
      loadMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, loadMessages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!selectedId || !messageText.trim() || sending) return;

    const text = messageText.trim();
    setMessageText('');
    setSending(true);

    // Optimistic update
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
        method:  'POST',
        body:    JSON.stringify({ content: text }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Replace optimistic message with real one
        setMessages(prev =>
          prev.map(m => m.id === tempMsg.id ? { ...json.data, is_sender: true } : m)
        );
        // Update last_message in conversation list
        setConversations(prev =>
          prev.map(c =>
            c.id === selectedId
              ? { ...c, last_message: text, last_message_time: new Date().toISOString() }
              : c
          )
        );
      }
    } catch (err) {
      console.error('[LinkedIn] send failed', err);
      // Remove optimistic message on failure
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setSending(false);
    }
  }, [selectedId, messageText, sending]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filteredConvs = conversations.filter(c =>
    !searchQuery ||
    c.contact.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.last_message.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedConv = conversations.find(c => c.id === selectedId) || null;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-1 h-full overflow-hidden">

      {/* ── Left sidebar: conversation list ──────────────────────────── */}
      <div className="w-[340px] flex-shrink-0 flex flex-col border-r border-border bg-card">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
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
              <Button variant="outline" size="sm" onClick={loadConversations}>
                Retry
              </Button>
            </div>
          ) : filteredConvs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 px-4 text-center">
              <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
              <p className="text-sm font-medium">No conversations found</p>
              <p className="text-xs mt-1 text-slate-400">
                {conversations.length === 0
                  ? 'Connect your LinkedIn account in Settings to see messages here.'
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

      {/* ── Right panel: messages ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-background">
        {!selectedConv ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Linkedin className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-base font-medium text-slate-500">Select a conversation</p>
            <p className="text-sm mt-1">Choose a LinkedIn chat from the left panel</p>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-card">
              <ContactAvatar contact={selectedConv.contact} />
              <div>
                <p className="font-semibold text-sm text-slate-900">{selectedConv.contact.name}</p>
                {selectedConv.contact.headline && (
                  <p className="text-xs text-slate-500 truncate max-w-xs">{selectedConv.contact.headline}</p>
                )}
              </div>
            </div>

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
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  No messages yet — start the conversation!
                </div>
              ) : (
                messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message input */}
            <div className="px-4 py-3 border-t border-border bg-card">
              <div className="flex items-end gap-2">
                <textarea
                  className="flex-1 resize-none rounded-xl border border-input bg-background px-3 py-2.5 text-sm leading-snug placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-h-[40px] max-h-[120px]"
                  placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                  rows={1}
                  value={messageText}
                  onChange={e => setMessageText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                />
                <Button
                  className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white h-10 w-10 p-0 rounded-xl"
                  onClick={handleSend}
                  disabled={!messageText.trim() || sending}
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
