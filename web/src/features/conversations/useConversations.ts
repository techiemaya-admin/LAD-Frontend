/**
 * Conversations Hook - Web Layer
 *
 * Fetches real CONTACTED leads as conversations from the backend.
 * Loads real LinkedIn chat messages via Unipile API.
 * Sends messages via Unipile API.
 * Receives live replies via SSE/webhook (dispatched into Redux).
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectConversations,
  selectActiveConversationId,
  addMessageToConversation,
  updateConversation,
  markConversationRead,
  setActiveConversation,
  setConversations,
  type Conversation,
  type Message,
} from '@/store/slices/conversationSlice';
import { RootState } from '@/store/store';

// ─── API helpers ──────────────────────────────────────────────────────────────

const API_BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'http://localhost:4003';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('auth_token') ||
    sessionStorage.getItem('token') ||
    null
  );
}

async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RealConversation {
  id: string;
  chatId: string;
  leadId: string;
  campaignId: string;
  platform: string;
  leadName: string;
  leadEmail: string | null;
  leadPhone: string | null;
  leadLinkedIn: string | null;
  accountName: string | null;
  providerAccountId: string | null;
  lastMessage: { text: string; direction: string; createdAt: string } | null;
  hasReply: boolean;
  unread: number;
  status: string;
  updatedAt: string;
  createdAt: string;
  leadAvatarUrl?: string | null;
  leadHeadline?: string | null;
}

export interface RealMessage {
  id: string;
  chatId: string;
  text: string;
  createdAt: string;
  direction: 'INCOMING' | 'OUTGOING';
  isOutgoing: boolean;
  senderName: string;
  status: string;
}

export interface UseConversationsReturn {
  conversations: RealConversation[];
  allConversations: RealConversation[];
  selectedConversation: RealConversation | null;
  selectedId: string | null;
  selectConversation: (id: string) => void;
  channelFilter: string | 'all';
  setChannelFilter: (channel: string | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  unreadCounts: Record<string, number>;
  sendMessage: (content: string) => void;
  markAsResolved: (id: string) => void;
  muteConversation: (id: string) => void;
  // messages for selected conversation
  messages: RealMessage[];
  messagesLoading: boolean;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useConversations(): UseConversationsReturn {
  const dispatch = useDispatch();

  // ── ALL real conversations (CONTACTED leads) ──
  const [allConversations, setAllConversations] = useState<RealConversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);

  // ── Messages for the selected chat ──
  const [messages, setMessages] = useState<RealMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

  // ── UI state ──
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Load all conversations on mount ──
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setConversationsLoading(true);
      try {
        const res = await apiFetch('/api/conversations');
        if (!cancelled && res.success) {
          setAllConversations(res.data || []);
          // Auto-select first conversation
          if (!selectedId && res.data?.length > 0) {
            setSelectedId(res.data[0].id);
          }
        }
      } catch (e) {
        console.error('[useConversations] Failed to load conversations', e);
      } finally {
        if (!cancelled) setConversationsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Lazy load missing avatars sequentially using ref-based queue ──
  const avatarFetchedRef = useRef<Set<string>>(new Set());
  const avatarFetchingRef = useRef(false);

  useEffect(() => {
    if (allConversations.length === 0 || avatarFetchingRef.current) return;

    // Build queue of conversations needing avatars
    const queue = allConversations.filter(
      c => !c.leadAvatarUrl && c.chatId && c.providerAccountId && !avatarFetchedRef.current.has(c.id)
    );
    if (queue.length === 0) return;

    let cancelled = false;
    avatarFetchingRef.current = true;

    const processQueue = async () => {
      for (const conv of queue) {
        if (cancelled) break;
        avatarFetchedRef.current.add(conv.id);
        try {
          const params: Record<string, string> = {
            chatId: conv.chatId!,
            account_id: conv.providerAccountId!
          };
          if (conv.leadLinkedIn) params.linkedinUrl = conv.leadLinkedIn;
          const urlParams = new URLSearchParams(params);
          const res = await apiFetch(`/api/conversations/avatar?${urlParams.toString()}`);
          if (!cancelled) {
            const avatarUrl = (res.success && res.avatar) ? res.avatar : 'none';
            setAllConversations(prev => prev.map(c =>
              c.id === conv.id ? { ...c, leadAvatarUrl: avatarUrl } : c
            ));
          }
        } catch {
          if (!cancelled) {
            setAllConversations(prev => prev.map(c =>
              c.id === conv.id ? { ...c, leadAvatarUrl: 'none' } : c
            ));
          }
        }
      }
      avatarFetchingRef.current = false;
    };

    processQueue();
    return () => { cancelled = true; avatarFetchingRef.current = false; };
  }, [allConversations.length]);  // only re-run when conversations list size changes

  const activeChatId = useMemo(() => allConversations.find(c => c.id === selectedId)?.chatId, [allConversations, selectedId]);
  const activeAccountId = useMemo(() => allConversations.find(c => c.id === selectedId)?.providerAccountId, [allConversations, selectedId]);

  // ── Load messages when selected conversation changes ──
  useEffect(() => {
    if (!selectedId || !activeChatId) return;

    let cancelled = false;
    const loadMessages = async () => {
      setMessagesLoading(true);
      setMessages([]);
      try {
        const accountParam = activeAccountId ? `?account_id=${activeAccountId}` : '';
        const res = await apiFetch(`/api/conversations/${activeChatId}/messages${accountParam}`);
        if (!cancelled && res.success) {
          setMessages(res.data || []);
          if (res.profile?.avatarUrl || res.profile?.headline) {
            setAllConversations(prev =>
              prev.map(c =>
                c.id === selectedId
                  ? {
                    ...c,
                    leadAvatarUrl: res.profile.avatarUrl || c.leadAvatarUrl,
                    leadHeadline: res.profile.headline || c.leadHeadline,
                    leadLinkedIn: res.profile.linkedinUrl || c.leadLinkedIn
                  }
                  : c
              )
            );
          }
        }
      } catch (e) {
        console.error('[useConversations] Failed to load messages', e);
      } finally {
        if (!cancelled) setMessagesLoading(false);
      }
    };
    loadMessages();
    return () => { cancelled = true; };
  }, [selectedId, activeChatId, activeAccountId]);

  // ── Filtering ──
  const conversations = useMemo(() => {
    return allConversations
      .filter(conv => {
        const matchesChannel =
          channelFilter === 'all' || conv.platform === channelFilter;
        const matchesSearch =
          searchQuery === '' ||
          conv.leadName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.leadEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conv.accountName?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesChannel && matchesSearch;
      })
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [allConversations, channelFilter, searchQuery]);

  const selectedConversation = useMemo(
    () => allConversations.find(c => c.id === selectedId) || null,
    [allConversations, selectedId]
  );

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    allConversations.forEach(conv => {
      counts.all += conv.unread || 0;
    });
    return counts;
  }, [allConversations]);

  const selectConversation = useCallback((id: string) => {
    setSelectedId(id);
    // Mark as read locally
    setAllConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, unread: 0 } : c))
    );
  }, []);

  // ── Send message via Unipile ──
  const sendMessage = useCallback(async (content: string) => {
    if (!selectedId || !content.trim()) return;
    const conv = allConversations.find(c => c.id === selectedId);
    if (!conv?.chatId) return;

    // Optimistic update
    const optimisticMsg: RealMessage = {
      id: `optimistic-${Date.now()}`,
      chatId: conv.chatId,
      text: content.trim(),
      createdAt: new Date().toISOString(),
      direction: 'OUTGOING',
      isOutgoing: true,
      senderName: 'You',
      status: 'sending',
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const res = await apiFetch(`/api/conversations/${conv.chatId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ text: content.trim(), account_id: conv.providerAccountId }),
      });

      if (res.success) {
        // Replace optimistic message with real one
        setMessages(prev =>
          prev.map(m => (m.id === optimisticMsg.id ? { ...res.data, status: 'sent' } : m))
        );
        // Update last message on conversation
        setAllConversations(prev =>
          prev.map(c =>
            c.id === selectedId
              ? {
                ...c,
                lastMessage: { text: content.trim(), direction: 'OUTGOING', createdAt: new Date().toISOString() },
                updatedAt: new Date().toISOString(),
              }
              : c
          )
        );
      }
    } catch (e) {
      console.error('[useConversations] Failed to send message', e);
      // Mark as failed
      setMessages(prev =>
        prev.map(m => (m.id === optimisticMsg.id ? { ...m, status: 'failed' } : m))
      );
    }
  }, [selectedId, allConversations]);

  const markAsResolved = useCallback((id: string) => {
    setAllConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, status: 'resolved' } : c))
    );
  }, []);

  const muteConversation = useCallback((id: string) => {
    setAllConversations(prev =>
      prev.map(c => (c.id === id ? { ...c, status: 'muted' } : c))
    );
  }, []);

  return {
    conversations,
    allConversations,
    selectedConversation,
    selectedId,
    selectConversation,
    channelFilter,
    setChannelFilter,
    searchQuery,
    setSearchQuery,
    unreadCounts,
    sendMessage,
    markAsResolved,
    muteConversation,
    messages,
    messagesLoading,
  };
}
