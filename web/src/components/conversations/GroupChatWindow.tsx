'use client';

import { memo, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import {
  Users,
  ArrowLeft,
  Loader2,
  X,
  Search,
  Bell,
  BellOff,
  Star,
  Lock,
  ImageIcon,
  FileText,
  Link2,
  LogOut,
  Trash2,
  ChevronRight,
  ChevronDown,
  Shield,
  UserPlus,
  UserMinus,
  MessageCircle,
  MoreVertical,
  BadgeCheck,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DateSeparator } from './DateSeparator';
import { format, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { safeStorage } from '@lad/shared/storage';  
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

// ── Types ──────────────────────────────────────────────────────────

interface GroupMember {
  lead_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  conversation_id: string;
  channel: string;
}

interface GroupDetail {
  id: string;
  name: string;
  color: string;
  description: string | null;
  members: GroupMember[];
  member_count: number;
}

interface GroupMessage {
  id: string;
  conversation_id: string;
  content: string;
  role: string;
  message_status: string;
  created_at: string;
  intent: string | null;
  sender_name: string;
  sender_phone: string | null;
  sender_company: string | null;
  channel: string;
  is_outgoing: boolean;
}

interface GroupChatWindowProps {
  groupId: string;
  groupName: string;
  groupColor: string;
  onBack: () => void;
  onGroupDeleted?: () => void;
  autoOpenInfo?: boolean;
  channel?: 'personal' | 'waba';
}

// ── Sender color palette (WhatsApp-style) ──────────────────────────

const SENDER_COLORS = [
  '#25D366', '#34B7F1', '#E91E63', '#FF9800',
  '#9C27B0', '#00BCD4', '#FF5722', '#4CAF50',
  '#2196F3', '#F44336', '#795548', '#607D8B',
];

function getSenderColor(senderName: string, colorMap: Map<string, string>): string {
  if (colorMap.has(senderName)) return colorMap.get(senderName)!;
  const idx = colorMap.size % SENDER_COLORS.length;
  const color = SENDER_COLORS[idx];
  colorMap.set(senderName, color);
  return color;
}

function getInitials(name: string): string {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

// ── List item types ────────────────────────────────────────────────

interface DateItem { type: 'date'; data: Date; key: string; }
interface MessageItem { type: 'message'; data: GroupMessage; key: string; senderColor: string; showSender: boolean; }
type ListItem = DateItem | MessageItem;

// ── Auth + API helpers ─────────────────────────────────────────────

const GROUP_API = '/api/whatsapp-conversations/chat-groups';
const CONV_API = '/api/whatsapp-conversations/conversations';

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${safeStorage.getItem('token') || ''}`,
  };
  const tenantId = typeof window !== 'undefined'
    ? localStorage.getItem('selectedTenantId') : null;
  if (tenantId && tenantId !== 'default') headers['X-Tenant-ID'] = tenantId;
  return headers;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetchWithTenant(url, {
    method: 'POST',
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = (data as Record<string, string>)?.message
      || (data as Record<string, string>)?.error
      || `POST ${url} ${response.status}`;
    throw new Error(message);
  }

  return data as T;
}

// ── Conversation search result type ────────────────────────────────

interface ConversationResult {
  id: string;
  lead_name: string;
  lead_phone: string | null;
  lead_email: string | null;
  lead_company: string | null;
  channel: string;
}

// ── Add Members Panel ──────────────────────────────────────────────

interface AddMembersPanelProps {
  groupId: string;
  channel: 'personal' | 'waba';
  existingConvIds: Set<string>;
  onClose: () => void;
  onMembersAdded: () => void;
}

const AddMembersPanel = memo(function AddMembersPanel({
  groupId,
  channel,
  existingConvIds,
  onClose,
  onMembersAdded,
}: AddMembersPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ConversationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // Channel source selector: 'personal' | 'waba'
  const [contactSource, setContactSource] = useState<'personal' | 'waba'>('personal');

  // Saved contacts state
  const [savedContacts, setSavedContacts] = useState<ConversationResult[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsTotal, setContactsTotal] = useState(0);

  // Load contacts for the selected source (personal WA or WABA)
  const loadContactsPage = useCallback((page: number, search = '', source?: 'personal' | 'waba') => {
    const src = source ?? contactSource;
    setContactsLoading(true);
    let url: string;
    if (src === 'personal') {
      const p = new URLSearchParams({ page: String(page), limit: '50' });
      if (search) p.set('search', search);
      url = `/api/personal-whatsapp/contacts?${p}`;
    } else {
      const p = new URLSearchParams({ limit: '50', offset: String((page - 1) * 50), channel: 'waba' });
      if (search) p.set('search', search);
      url = `/api/whatsapp-conversations/conversations?${p}`;
    }
    fetch(url, { headers: authHeaders() })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) { setSavedContacts([]); return; }
        const raw: Record<string, unknown>[] = data?.data || data?.conversations || [];
        setContactsTotal(data?.total || raw.length);
        setContactsPage(page);
        if (src === 'personal') {
          setSavedContacts(raw.map((c, idx) => ({
            id: String((c as Record<string,unknown>).id || (c as Record<string,unknown>).whatsapp_id || (c as Record<string,unknown>).phone || `pwa-${page}-${idx}`),
            lead_name: (c.name || c.contact_name || c.phone) as string | null,
            lead_phone: c.phone as string | null,
            lead_email: null,
            lead_company: null,
            channel: 'personal',
          })));
        } else {
          setSavedContacts(raw.map((c, idx) => ({
            id: String(c.id || `waba-${page}-${idx}`),
            lead_name: (c.lead_name || c.contact_name || c.name) as string | null,
            lead_phone: (c.lead_phone || c.phone) as string | null,
            lead_email: (c.lead_email || c.email) as string | null,
            lead_company: null,
            channel: 'waba',
          })));
        }
      })
      .catch(() => setSavedContacts([]))
      .finally(() => setContactsLoading(false));
  }, [contactSource]);

  // Reload when source changes
  useEffect(() => {
    setSavedContacts([]);
    setContactsPage(1);
    loadContactsPage(1, '', contactSource);
  }, [contactSource]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search conversations
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); return; }

    const timer = setTimeout(() => {
      setLoading(true);
      // Search both conversations and contacts in parallel
      const convSearch = fetch(`${CONV_API}?search=${encodeURIComponent(q)}`, { headers: authHeaders() })
        .then((r) => r.json())
        .then((data) => {
          const convs = data.data || data || [];
          return convs
            .filter((c: Record<string, unknown>) => !existingConvIds.has(c.id as string))
            .map((c: Record<string, unknown>) => ({
              id: c.id as string,
              lead_name: (c.contact as Record<string, unknown>)?.name as string || (c as Record<string, unknown>).lead_name as string || 'Unknown',
              lead_phone: (c.contact as Record<string, unknown>)?.phone as string || (c as Record<string, unknown>).lead_phone as string || null,
              lead_email: (c as Record<string, unknown>).lead_email as string || null,
              lead_company: (c as Record<string, unknown>).lead_company as string || null,
              channel: (c as Record<string, unknown>).channel as string || 'whatsapp',
            })) as ConversationResult[];
        })
        .catch(() => [] as ConversationResult[]);

      // Also search saved contacts server-side
      loadContactsPage(1, q);

      convSearch.then((convResults) => {
        setResults(convResults);
      }).finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query, existingConvIds, loadContactsPage]);

  const toggleSelect = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleAdd = useCallback(async () => {
    if (selected.size === 0) return;
    setAdding(true);
    try {
      const res = await fetch(`${GROUP_API}/${groupId}/conversations?channel=${channel}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ conversation_ids: Array.from(selected) }),
      });
      const data = await res.json();
      console.log('[AddMembersPanel] add result:', data);
      onMembersAdded();
    } catch (err) {
      console.error('Error adding members:', err);
    } finally {
      setAdding(false);
    }
  }, [groupId, channel, selected, onMembersAdded]);

  return (
    <div className="absolute inset-0 z-10 bg-card flex flex-col">
      <div className="h-14 px-4 flex items-center gap-3 border-b border-border flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">Add members</span>
        {selected.size > 0 && (
          <Button size="sm" className="ml-auto h-7 text-xs" onClick={handleAdd} disabled={adding}>
            {adding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            Add {selected.size}
          </Button>
        )}
      </div>

      {/* Channel source tabs */}
      <div className="px-4 pt-3 pb-1 flex gap-2">
        {(['personal', 'waba'] as const).map((src) => (
          <button
            key={src}
            onClick={() => setContactSource(src)}
            className={cn(
              'flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors',
              contactSource === src
                ? src === 'personal'
                  ? 'bg-emerald-500 text-white'
                  : 'bg-teal-700 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {src === 'personal' ? '📱 Personal WA' : '💼 WA Business'}
          </button>
        ))}
      </div>

      <div className="px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={`Search ${contactSource === 'personal' ? 'Personal WA' : 'WA Business'} contacts...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-9 text-sm pl-9"
            autoFocus
          />
        </div>
      </div>

      {/* Selected chips */}
      {selected.size > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {Array.from(selected).map((id) => {
            const r = results.find((x) => x.id === id) || savedContacts.find((x) => x.id === id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs cursor-pointer"
                onClick={() => toggleSelect(id)}
              >
                {r?.lead_name || id.slice(0, 8)}
                <X className="h-3 w-3" />
              </span>
            );
          })}
        </div>
      )}

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading && contactsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Conversation results (when searching) */}
            {query.trim() && results.length > 0 && (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Conversations
                </p>
                {results.map((conv) => (
                  <button
                    key={conv.id}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left',
                      selected.has(conv.id) && 'bg-primary/5'
                    )}
                    onClick={() => toggleSelect(conv.id)}
                  >
                    <div className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                      selected.has(conv.id) ? 'bg-primary' : 'bg-muted-foreground/30'
                    )}>
                      {selected.has(conv.id) ? '✓' : getInitials(conv.lead_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium truncate block">{conv.lead_name}</span>
                      <span className="text-[11px] text-muted-foreground truncate block">
                        {conv.lead_phone || conv.lead_email || ''}
                        {conv.lead_company ? ` · ${conv.lead_company}` : ''}
                      </span>
                    </div>
                    {conv.channel !== 'whatsapp' && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase font-medium">
                        {conv.channel}
                      </span>
                    )}
                  </button>
                ))}
              </>
            )}

            {/* Saved contacts section */}
            {contactsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-xs text-muted-foreground">Loading contacts...</span>
              </div>
            ) : savedContacts.length > 0 ? (
              <>
                <p className="px-4 pt-3 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Saved Contacts ({contactsTotal})
                </p>
                {savedContacts.map((contact) => (
                  <button
                    key={contact.id}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors text-left',
                      selected.has(contact.id) && 'bg-primary/5'
                    )}
                    onClick={() => toggleSelect(contact.id)}
                  >
                    <div className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                      selected.has(contact.id) ? 'bg-primary' : 'bg-emerald-500/70'
                    )}>
                      {selected.has(contact.id) ? '✓' : getInitials(contact.lead_name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{contact.lead_name}</span>
                        <span className="flex-shrink-0 text-[9px] px-1 py-0.5 rounded font-medium"
                          style={{
                            background: contact.channel === 'personal' ? '#dcfce7' : '#d1fae5',
                            color:      contact.channel === 'personal' ? '#15803d' : '#065f46',
                          }}>
                          {contact.channel === 'personal' ? 'Personal WA' : 'WA Business'}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate block">
                        {contact.lead_phone || contact.lead_email || ''}
                      </span>
                    </div>
                  </button>
                ))}
                {/* Pagination for contacts */}
                {contactsTotal > 50 && (
                  <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground">
                    <span>
                      {(contactsPage - 1) * 50 + 1}–{Math.min(contactsPage * 50, contactsTotal)} of {contactsTotal}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        disabled={contactsPage <= 1 || contactsLoading}
                        onClick={() => loadContactsPage(contactsPage - 1, query.trim())}
                      >
                        Prev
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[11px]"
                        disabled={contactsPage * 50 >= contactsTotal || contactsLoading}
                        onClick={() => loadContactsPage(contactsPage + 1, query.trim())}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : !query.trim() ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No saved contacts found
              </p>
            ) : results.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">
                No results found
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
});

// ── Group Info Panel (WhatsApp-style) ──────────────────────────────

interface GroupInfoPanelProps {
  groupId: string;
  channel: 'personal' | 'waba';
  detail: GroupDetail;
  groupColor: string;
  senderColorMap: Map<string, string>;
  onClose: () => void;
  onMembersChanged: () => void;
  onGroupDeleted: () => void;
}

const GroupInfoPanel = memo(function GroupInfoPanel({
  groupId,
  channel,
  detail,
  groupColor,
  senderColorMap,
  onClose,
  onMembersChanged,
  onGroupDeleted,
}: GroupInfoPanelProps) {
  const [memberSearch, setMemberSearch] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [googleAdsConnected, setGoogleAdsConnected] = useState(false);
  const [metaAdsConnected, setMetaAdsConnected] = useState(false);
  const [loadingAdsStatus, setLoadingAdsStatus] = useState(false);
  const [connectingGoogleAds, setConnectingGoogleAds] = useState(false);
  const [connectingMetaAds, setConnectingMetaAds] = useState(false);
  const [disconnectingGoogleAds, setDisconnectingGoogleAds] = useState(false);
  const [disconnectingMetaAds, setDisconnectingMetaAds] = useState(false);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const existingConvIds = useMemo(
    () => new Set(detail.members.map((m) => m.conversation_id)),
    [detail.members]
  );

  const filteredMembers = useMemo(() => {
    if (!memberSearch.trim()) return detail.members;
    const q = memberSearch.toLowerCase();
    return detail.members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.phone && m.phone.includes(q)) ||
        (m.company && m.company.toLowerCase().includes(q))
    );
  }, [detail.members, memberSearch]);

  const getUserId = useCallback(async (): Promise<string | null> => {
    const token = safeStorage.getItem('token') || '';
    const meRes = await fetch('/api/auth/me', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!meRes.ok) return null;
    const meData = await meRes.json();
    return meData?.user?.id || meData?.id || null;
  }, []);

  const loadAdsStatus = useCallback(async () => {
    setLoadingAdsStatus(true);
    try {
      const userId = await getUserId();
      if (!userId) {
        setGoogleAdsConnected(false);
        setMetaAdsConnected(false);
        return;
      }

      const [googleStatus, metaStatus] = await Promise.all([
        postJson<any>('/api/social-integration/ads/google/status', {
          user_id: userId,
          frontend_id: process.env.NEXT_PUBLIC_VOAG_ADS_FRONTEND_ID || 'group-info',
        }),
        postJson<any>('/api/social-integration/ads/meta/status', {
          user_id: userId,
          frontend_id: process.env.NEXT_PUBLIC_VOAG_ADS_FRONTEND_ID || 'group-info',
        }),
      ]);

      setGoogleAdsConnected(!!googleStatus?.connected);
      setMetaAdsConnected(!!metaStatus?.connected);
    } catch {
      setGoogleAdsConnected(false);
      setMetaAdsConnected(false);
    } finally {
      setLoadingAdsStatus(false);
    }
  }, [getUserId]);

  useEffect(() => {
    loadAdsStatus();
  }, [loadAdsStatus]);

  const handleConnectGoogleAds = useCallback(async () => {
    setConnectingGoogleAds(true);
    try {
      const userId = await getUserId();
      if (!userId) return;

      const result = await postJson<any>('/api/social-integration/ads/google/start', {
        user_id: userId,
        frontend_id: process.env.NEXT_PUBLIC_VOAG_ADS_FRONTEND_ID || 'group-info',
      });

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to connect Google Ads:', error);
    } finally {
      setConnectingGoogleAds(false);
    }
  }, [getUserId]);

  const handleConnectMetaAds = useCallback(async () => {
    setConnectingMetaAds(true);
    try {
      const userId = await getUserId();
      if (!userId) return;

      const result = await postJson<any>('/api/social-integration/ads/meta/start', {
        user_id: userId,
        frontend_id: process.env.NEXT_PUBLIC_VOAG_ADS_FRONTEND_ID || 'group-info',
      });

      if (result?.url) {
        window.location.href = result.url;
      }
    } catch (error) {
      console.error('Failed to connect Meta Ads:', error);
    } finally {
      setConnectingMetaAds(false);
    }
  }, [getUserId]);

  const handleDisconnectGoogleAds = useCallback(async () => {
    setDisconnectingGoogleAds(true);
    try {
      const userId = await getUserId();
      if (!userId) return;

      await postJson('/api/social-integration/ads/google/disconnect', {
        user_id: userId,
        frontend_id: process.env.NEXT_PUBLIC_VOAG_ADS_FRONTEND_ID || 'group-info',
      });
      await loadAdsStatus();
    } catch (error) {
      console.error('Failed to disconnect Google Ads:', error);
    } finally {
      setDisconnectingGoogleAds(false);
    }
  }, [getUserId, loadAdsStatus]);

  const handleDisconnectMetaAds = useCallback(async () => {
    setDisconnectingMetaAds(true);
    try {
      const userId = await getUserId();
      if (!userId) return;

      await postJson('/api/social-integration/ads/meta/disconnect', {
        user_id: userId,
        frontend_id: process.env.NEXT_PUBLIC_VOAG_ADS_FRONTEND_ID || 'group-info',
      });
      await loadAdsStatus();
    } catch (error) {
      console.error('Failed to disconnect Meta Ads:', error);
    } finally {
      setDisconnectingMetaAds(false);
    }
  }, [getUserId, loadAdsStatus]);

  const handleRemoveMember = useCallback(async (conversationId: string) => {
    setRemovingId(conversationId);
    try {
      await fetch(`${GROUP_API}/${groupId}/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      onMembersChanged();
    } catch (err) {
      console.error('Error removing member:', err);
    } finally {
      setRemovingId(null);
      setActionMenuId(null);
    }
  }, [groupId, onMembersChanged]);

  const handleMembersAdded = useCallback(() => {
    setShowAddMembers(false);
    onMembersChanged();
  }, [onMembersChanged]);

  const handleDeleteGroup = useCallback(async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`${GROUP_API}/${groupId}?channel=${channel}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (res.ok) {
        onGroupDeleted();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to delete group: ${err.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('Failed to delete group');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [groupId, channel, onGroupDeleted]);

  return (
    <div className="w-[340px] h-full flex flex-col bg-card border-l border-border flex-shrink-0 overflow-hidden relative">
      {/* Add Members overlay */}
      {showAddMembers && (
        <AddMembersPanel
          groupId={groupId}
          channel={channel}
          existingConvIds={existingConvIds}
          onClose={() => setShowAddMembers(false)}
          onMembersAdded={handleMembersAdded}
        />
      )}

      {/* Header */}
      <div className="h-14 px-4 flex items-center gap-3 border-b border-border flex-shrink-0">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm">Group info</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Group avatar + name */}
        <div className="flex flex-col items-center py-6 px-4 border-b border-border">
          <div
            className="h-20 w-20 rounded-full flex items-center justify-center text-white font-bold text-2xl mb-3"
            style={{ backgroundColor: groupColor }}
          >
            {detail.name.charAt(0).toUpperCase()}
          </div>
          <h2 className="font-semibold text-lg text-center">{detail.name}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Group · {detail.member_count} members
          </p>
        </div>

        {/* Description */}
        {detail.description && (
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm">{detail.description}</p>
          </div>
        )}

        {/* Quick actions */}
        <div className="px-2 py-2 border-b border-border">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            {isMuted ? <BellOff className="h-4 w-4 text-muted-foreground" /> : <Bell className="h-4 w-4 text-muted-foreground" />}
            <span className="text-sm flex-1 text-left">{isMuted ? 'Unmute notifications' : 'Mute notifications'}</span>
          </button>
          <button
            onClick={() => setIsStarred(!isStarred)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
          >
            <Star className={cn('h-4 w-4', isStarred ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground')} />
            <span className="text-sm flex-1 text-left">{isStarred ? 'Starred' : 'Star group'}</span>
          </button>
        </div>

        {/* Campaign integrations */}
        <div className="px-2 py-2 border-b border-border">
          <div className="px-2 pb-2">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
              Campaign Integrations
            </p>
          </div>

          <div className="space-y-1">
            <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Google Ads</p>
                <p className="text-[11px] text-muted-foreground">Link campaign source tracking</p>
              </div>
              {loadingAdsStatus ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : googleAdsConnected ? (
                <BadgeCheck className="h-4 w-4 text-green-600" />
              ) : null}
              {googleAdsConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={handleDisconnectGoogleAds}
                  disabled={disconnectingGoogleAds}
                >
                  {disconnectingGoogleAds ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={handleConnectGoogleAds}
                  disabled={connectingGoogleAds}
                >
                  {connectingGoogleAds ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>

            <div className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/30 transition-colors">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">Meta Ads</p>
                <p className="text-[11px] text-muted-foreground">Link Facebook/Instagram ad account</p>
              </div>
              {loadingAdsStatus ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : metaAdsConnected ? (
                <BadgeCheck className="h-4 w-4 text-green-600" />
              ) : null}
              {metaAdsConnected ? (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[11px]"
                  onClick={handleDisconnectMetaAds}
                  disabled={disconnectingMetaAds}
                >
                  {disconnectingMetaAds ? 'Disconnecting...' : 'Disconnect'}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={handleConnectMetaAds}
                  disabled={connectingMetaAds}
                >
                  {connectingMetaAds ? 'Connecting...' : 'Connect'}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Encryption notice */}
        <div className="px-4 py-3 border-b border-border flex items-start gap-3">
          <Lock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            Messages are end-to-end encrypted. Only people in this chat can read or listen to them.
          </p>
        </div>

        {/* Members section */}
        <div className="border-b border-border">
          <div className="px-4 pt-3 pb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {detail.member_count} members
            </span>
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Member search */}
          <div className="px-4 pb-2">
            <input
              type="text"
              placeholder="Search members..."
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full h-8 px-3 text-xs bg-muted/50 border border-border rounded-md outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Add member button */}
          <button
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 transition-colors"
            onClick={() => setShowAddMembers(true)}
          >
            <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-medium text-green-600">Add member</span>
          </button>

          {/* Admin row */}
          <div className="px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium block">You</span>
              <span className="text-[11px] text-muted-foreground">Admin</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              Group admin
            </span>
          </div>

          {/* Member list */}
          {filteredMembers.map((member) => {
            const color = getSenderColor(member.name, senderColorMap);
            const isMenuOpen = actionMenuId === member.conversation_id;
            const isRemoving = removingId === member.conversation_id;

            return (
              <div
                key={member.conversation_id}
                className="relative px-4 py-2.5 flex items-center gap-3 hover:bg-muted/30 transition-colors group/member"
              >
                <div
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: color }}
                >
                  {getInitials(member.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block truncate">{member.name}</span>
                  <span className="text-[11px] text-muted-foreground truncate block">
                    {member.phone || member.email || ''}
                    {member.company ? ` · ${member.company}` : ''}
                  </span>
                </div>
                {member.channel && member.channel !== 'whatsapp' && (() => {
                  const ch = member.channel.startsWith('personal') ? 'personal' : member.channel;
                  const label = ch === 'personal' ? 'Personal WA' : ch === 'waba' ? 'WABA' : ch.toUpperCase();
                  const style = ch === 'personal'
                    ? { background: '#dcfce7', color: '#15803d' }
                    : ch === 'waba'
                    ? { background: '#d1fae5', color: '#065f46' }
                    : { background: '#dbeafe', color: '#1d4ed8' };
                  return (
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-medium" style={style}>
                      {label}
                    </span>
                  );
                })()}

                {/* Action toggle */}
                <button
                  className={cn(
                    'h-7 w-7 flex items-center justify-center rounded-md transition-all',
                    isMenuOpen
                      ? 'bg-muted text-foreground'
                      : 'opacity-0 group-hover/member:opacity-100 hover:bg-muted text-muted-foreground'
                  )}
                  onClick={() => setActionMenuId(isMenuOpen ? null : member.conversation_id)}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Action dropdown */}
                {isMenuOpen && (
                  <div className="absolute right-4 top-full z-20 w-48 bg-card border border-border rounded-lg shadow-xl py-1 mt-1">
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left"
                      onClick={() => setActionMenuId(null)}
                    >
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      Message {member.name.split(' ')[0]}
                    </button>
                    <button
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-50 transition-colors text-left text-red-500"
                      onClick={() => handleRemoveMember(member.conversation_id)}
                      disabled={isRemoving}
                    >
                      {isRemoving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                      Remove
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Danger zone */}
        <div className="px-2 py-2">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={isDeleting}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 transition-colors text-red-500 disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            <span className="text-sm flex-1 text-left">Delete group</span>
          </button>
        </div>

        {/* Delete confirmation dialog */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 rounded-lg">
            <div className="bg-card border border-border rounded-xl shadow-xl p-5 mx-4 w-full max-w-xs">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="h-5 w-5 text-red-500 flex-shrink-0" />
                <h3 className="font-semibold text-sm">Delete group?</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                <span className="font-medium text-foreground">"{detail.name}"</span> and all its members will be permanently deleted. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleDeleteGroup}
                  disabled={isDeleting}
                >
                  {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// ── Main Component ─────────────────────────────────────────────────

export const GroupChatWindow = memo(function GroupChatWindow({
  groupId,
  groupName,
  groupColor,
  onBack,
  onGroupDeleted,
  autoOpenInfo = false,
  channel = 'waba',
}: GroupChatWindowProps) {
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInfoPanel, setShowInfoPanel] = useState(autoOpenInfo);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const senderColorMap = useRef(new Map<string, string>()).current;

  // Fetch group detail + messages
  const fetchData = useCallback(() => {
    setLoading(true);
    setMessages([]);
    setDetail(null);
    setDetailError(null);
    senderColorMap.clear();

    Promise.allSettled([
      fetch(`${GROUP_API}/${groupId}/detail?channel=${channel}`, { headers: authHeaders() }).then((r) => r.json()),
      fetch(`${GROUP_API}/${groupId}/messages?limit=100&channel=${channel}`, { headers: authHeaders() }).then((r) => r.json()),
    ])
      .then(([detailResult, messagesResult]) => {
        if (detailResult.status === 'fulfilled') {
          const detailRes = detailResult.value;
          console.log('[GroupChatWindow] detail response:', detailRes);
          if (detailRes?.success) {
            setDetail(detailRes.data);
            console.log('[GroupChatWindow] members count:', detailRes.data?.members?.length, detailRes.data?.members);
          } else {
            setDetailError(detailRes?.error || 'Unable to load group info');
          }
        } else {
          setDetailError('Unable to load group info');
          console.error('Error loading group detail:', detailResult.reason);
        }

        if (messagesResult.status === 'fulfilled') {
          const msgsRes = messagesResult.value;
          if (msgsRes?.success) {
            const sorted = (msgsRes.data as GroupMessage[]).slice().reverse();
            setMessages(sorted);
          }
        } else {
          console.error('Error loading group messages:', messagesResult.reason);
        }
      })
      .catch((err) => console.error('Error loading group chat:', err))
      .finally(() => setLoading(false));
  }, [groupId, senderColorMap, channel]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Refresh just the detail (after add/remove member)
  const refreshDetail = useCallback(() => {
    fetch(`${GROUP_API}/${groupId}/detail?channel=${channel}`, { headers: authHeaders() })
      .then((r) => r.json())
      .then((res) => { if (res.success) setDetail(res.data); })
      .catch(() => {});
  }, [groupId, channel]);

  // Build list items with date separators & sender attribution
  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    let lastDate: Date | null = null;
    let lastSender: string | null = null;

    messages.forEach((msg) => {
      const msgDate = new Date(msg.created_at);

      if (!lastDate || !isSameDay(lastDate, msgDate)) {
        items.push({ type: 'date', data: msgDate, key: `date-${msgDate.toISOString()}` });
        lastDate = msgDate;
        lastSender = null;
      }

      const senderKey = msg.is_outgoing ? '__outgoing__' : (msg.sender_name || 'Unknown');
      const showSender = !msg.is_outgoing && senderKey !== lastSender;
      const color = msg.is_outgoing ? '#999' : getSenderColor(senderKey, senderColorMap);

      items.push({ type: 'message', data: msg, key: msg.id, senderColor: color, showSender });
      lastSender = senderKey;
    });

    return items;
  }, [messages, senderColorMap]);

  // Sync autoOpenInfo prop to showInfoPanel state
  useEffect(() => {
    setShowInfoPanel(autoOpenInfo);
  }, [autoOpenInfo]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (virtuosoRef.current && listItems.length > 0) {
      virtuosoRef.current.scrollToIndex({ index: listItems.length - 1, behavior: 'smooth' });
    }
  }, [listItems.length]);

  const memberNames = useMemo(() => {
    if (!detail) return '';
    return detail.members.map((m) => m.name).join(', ');
  }, [detail]);

  const renderItem = useCallback(
    (index: number) => {
      const item = listItems[index];
      if (item.type === 'date') {
        return <DateSeparator date={item.data} />;
      }

      const { data: msg, senderColor, showSender } = item;

      return (
        <div className={cn('px-4 py-0.5', msg.is_outgoing ? 'flex justify-end' : 'flex justify-start')}>
          <div className={cn('max-w-[70%] px-3 py-2 shadow-sm', msg.is_outgoing ? 'message-bubble-outgoing' : 'message-bubble-incoming')}>
            {showSender && (
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-semibold" style={{ color: senderColor }}>
                  {msg.sender_name}
                </span>
                {msg.sender_phone && (
                  <span className="text-[10px] opacity-60" style={{ color: senderColor }}>
                    {msg.sender_phone}
                  </span>
                )}
              </div>
            )}
            <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
            <div className={cn('flex items-center gap-1 mt-1', msg.is_outgoing ? 'justify-end' : 'justify-start')}>
              <span className={cn('text-[10px]', msg.is_outgoing ? 'opacity-80' : 'text-muted-foreground')}>
                {format(new Date(msg.created_at), 'h:mm a')}
              </span>
            </div>
          </div>
        </div>
      );
    },
    [listItems]
  );

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background/50">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex min-w-0">
      {/* Main chat column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Group Header */}
        <div className="h-16 px-4 flex items-center gap-3 bg-card border-b border-border flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>

          <div
            className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 cursor-pointer"
            style={{ backgroundColor: groupColor }}
            onClick={() => setShowInfoPanel(true)}
          >
            {groupName.charAt(0).toUpperCase()}
          </div>

          <div
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => setShowInfoPanel(true)}
          >
            <h3 className="font-semibold text-sm truncate">{groupName}</h3>
            <p className="text-xs text-muted-foreground truncate">
              {detail ? `${detail.member_count} members` : ''}
              {memberNames ? ` · ${memberNames}` : ''}
            </p>
          </div>

          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowInfoPanel(!showInfoPanel)}>
            <Users className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-hidden whatsapp-chat-bg">
          {listItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Users className="h-12 w-12 mb-3 opacity-40" />
              <p className="text-sm font-medium">No messages yet</p>
              <p className="text-xs mt-1">Messages from group members will appear here</p>
            </div>
          ) : (
            <Virtuoso
              ref={virtuosoRef}
              style={{ height: '100%' }}
              totalCount={listItems.length}
              itemContent={renderItem}
              followOutput="smooth"
              alignToBottom
              className="custom-scrollbar"
              initialTopMostItemIndex={listItems.length - 1}
            />
          )}
        </div>
      </div>

      {/* WhatsApp-style Group Info Panel */}
      {showInfoPanel && (
        detail ? (
          <GroupInfoPanel
            groupId={groupId}
            channel={channel}
            detail={detail}
            groupColor={groupColor}
            senderColorMap={senderColorMap}
            onClose={() => setShowInfoPanel(false)}
            onMembersChanged={refreshDetail}
            onGroupDeleted={onGroupDeleted ?? onBack}
          />
        ) : (
          <div className="w-[340px] h-full flex flex-col bg-card border-l border-border flex-shrink-0 overflow-hidden">
            <div className="h-14 px-4 flex items-center gap-3 border-b border-border flex-shrink-0">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowInfoPanel(false)}>
                <X className="h-4 w-4" />
              </Button>
              <span className="font-semibold text-sm">Group info</span>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {detailError ? (
                <div className="px-6 text-center">
                  <p className="text-sm text-muted-foreground mb-3">{detailError}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={fetchData}
                  >
                    Retry
                  </Button>
                </div>
              ) : (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
});
