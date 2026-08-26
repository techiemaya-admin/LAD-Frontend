/**
 * Conversations Feature - API Functions
 *
 * All HTTP API calls for the conversations feature.
 * Uses proxyClient (relative fetch) since these go through Next.js
 * API routes that proxy to Python services.
 *
 * Follows the same pattern as campaigns/api.ts for consistency.
 */
import { queryOptions, infiniteQueryOptions } from '@tanstack/react-query';
import { proxyClient } from '../../shared/proxyClient';
import { safeStorage } from '../../shared/storage';
import type {
  Conversation,
  ConversationListFilters,
  Message,
  MessageStatus,
  ConversationStatus,
  Channel,
  ConversationOwner,
  ConversationState,
  ConversationStats,
  SendMessageRequest,
} from './types';

// ====================
// Query Keys
// ====================

export const conversationKeys = {
  all: ['conversations'] as const,
  lists: () => [...conversationKeys.all, 'list'] as const,
  list: (filters?: ConversationListFilters) => [...conversationKeys.lists(), filters] as const,
  details: () => [...conversationKeys.all, 'detail'] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
  messages: (conversationId: string, pagination?: { limit?: number; offset?: number }) =>
    [...conversationKeys.all, 'messages', conversationId, pagination] as const,
  stats: () => [...conversationKeys.all, 'stats'] as const,
} as const;

// ====================
// Data Mappers (snake_case API → camelCase TS)
// ====================

function mapStatusFromApi(status: string): ConversationStatus {
  if (status === 'resolved' || status === 'muted') return status;
  return 'open'; // 'active' in DB maps to 'open' in UI
}

function mapChannelFromApi(channel?: string): Channel {
  if (channel === 'linkedin' || channel === 'gmail') return channel;
  return 'whatsapp';
}

function mapMessageFromApi(raw: any): Message {
  const rawRole = raw.role || 'user';

  // WABA stores human-agent messages as role='assistant' with metadata.sender_type='human_agent'
  // Normalise so callers always see role='human_agent' for human takeover messages.
  const metadata: Record<string, any> =
    typeof raw.metadata === 'string'
      ? (() => { try { return JSON.parse(raw.metadata); } catch { return {}; } })()
      : (raw.metadata || {});

  const role =
    metadata.sender_type === 'human_agent' && rawRole === 'assistant'
      ? 'human_agent'
      : rawRole;

  const isOutgoing = role === 'assistant' || role === 'AI' || role === 'human_agent';

  // Agent-forward messages surface the customer as a sender label (like a group).
  // NEW forwards carry the name in metadata with a clean body; OLD ones baked
  // "📩 *New message from X*\n\nBody" into the content - parse those as a fallback.
  let displayContent: string = raw.content || '';
  let forwardSender: string | undefined =
    (metadata.via === 'agent_forward' || metadata.sender_type === 'forward')
      ? (metadata.sender_name || undefined)
      : undefined;
  if (!forwardSender) {
    const fwd = displayContent.match(/^[^\n]*\*New message from ([^*\n]+)\*\s*\n+([\s\S]+)$/);
    if (fwd) { forwardSender = fwd[1].trim(); displayContent = fwd[2].trim(); }
  }

  // Display name shown above a bubble:
  //  • human-agent (outgoing takeover) → the agent's name
  //  • incoming GROUP message          → the participant who sent it
  //  • agent-forward                   → the customer the message is from
  //  • 1:1 chats                        → undefined (no per-message label)
  const senderName: string | undefined =
    role === 'human_agent'
      ? (metadata.sender_name || metadata.agent_name || raw.sender_name || undefined)
      : (forwardSender
          || (metadata.is_group && !isOutgoing
              ? (metadata.sender_name || metadata.sender_phone || undefined)
              : undefined));

  const rawType = String(raw.type || '').toLowerCase();
  const inferredMediaTypeFromRawType =
    rawType === 'image' || rawType === 'video' || rawType === 'audio' || rawType === 'document'
      ? rawType
      : undefined;

  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    content: displayContent,
    timestamp: new Date(raw.created_at),
    isOutgoing,
    // DB default is 'received' for all messages; outbound ones get backfilled to 'sent'.
    // Map 'received' → 'sent' for display (shows clock icon) since older rows may
    // still carry the DB default before the wamid-backfill was introduced.
    status: (() => {
      const s = raw.message_status || raw.status || '';
      if (s === 'read' || s === 'seen') return 'read' as MessageStatus;
      if (s === 'delivered' || s === 'delivered_to_device') return 'delivered' as MessageStatus;
      if (s === 'failed' || s === 'error') return 'failed' as MessageStatus;
      return 'sent' as MessageStatus;
    })(),
    sender: {
      id: isOutgoing ? (metadata.human_agent_id || 'agent') : raw.lead_id || 'user',
      name: isOutgoing
        ? (role === 'human_agent' ? (senderName || 'Agent') : 'AI Agent')
        : (metadata.is_group ? (senderName || 'Member') : 'Contact'),
    },
    role,
    intent: raw.intent,
    senderName,
    humanAgentId: metadata.human_agent_id || undefined,
    templateName: metadata.template_name || raw.template_name || undefined,
    // Location fields (extracted from metadata)
    latitude: metadata.latitude !== undefined
      ? Number(metadata.latitude)
      : (raw.latitude !== undefined ? Number(raw.latitude) : undefined),
    longitude: metadata.longitude !== undefined
      ? Number(metadata.longitude)
      : (raw.longitude !== undefined ? Number(raw.longitude) : undefined),
    locationName: metadata.location_name || raw.location_name || undefined,
    locationAddress: metadata.location_address || raw.location_address || undefined,
    // Inbound media fields (extracted from metadata)
    mediaId: metadata.media_id || raw.media_id || raw.mediaId || raw.file_url || raw.url || undefined,
    mediaType: metadata.message_type || metadata.media_type || raw.message_type || raw.media_type || raw.mediaType || inferredMediaTypeFromRawType || undefined,
    mediaMimeType: metadata.mime_type || raw.mime_type || raw.content_type || raw.media_mime_type || undefined,
    mediaFilename: metadata.filename || raw.filename || raw.media_filename || undefined,
    mediaCaption: metadata.caption || raw.caption || undefined,
    starred: Boolean(metadata.starred),
  };
}

// A conversation's "last activity" can live in either column: updated_at is
// bumped on every message, but last_message_at historically was NOT (so it could
// be stale). Use whichever is NEWER for both display and sort, so a freshly-active
// chat is never ranked/shown as old (real bug 2026-06-20: a chat active "2 min"
// ago sorted among 2-month chats because the sort keyed off the stale
// last_message_at). Backend now keeps the two in lock-step; this is belt-and-
// braces and self-heals before the backfill runs.
function latestActivityDate(...candidates: Array<string | null | undefined>): Date {
  const times = candidates
    .map((c) => (c ? new Date(c).getTime() : NaN))
    .filter((t) => !Number.isNaN(t));
  return new Date(times.length ? Math.max(...times) : Date.now());
}

function mapConversationFromApi(raw: any): Conversation {
  return {
    id: raw.id,
    leadId: raw.lead_id,
    channel: mapChannelFromApi(raw.lead_channel),
    contact: {
      id: raw.lead_id,
      // Prefer stored name; fall back to phone so we never show "Unknown"
      name: raw.lead_name || raw.lead_phone || raw.phone || 'Unknown',
      phone: raw.lead_phone,
      email: raw.lead_email,
      avatar: raw.lead_avatar || undefined,
    },
    messages: [], // Messages loaded separately
    lastMessage: raw.last_message_content
      ? {
          id: `last-${raw.id}`,
          conversationId: raw.id,
          content: raw.last_message_content,
          timestamp: latestActivityDate(raw.last_message_at, raw.updated_at),
          isOutgoing: raw.last_message_role !== 'user',
          status: 'sent',
          sender: {
            id: raw.last_message_role === 'user' ? raw.lead_id : 'agent',
            name: raw.last_message_role === 'user' ? (raw.lead_name || raw.lead_phone || 'Contact') : 'AI Agent',
          },
        }
      : null,
    unreadCount: raw.unread_count || 0,
    status: mapStatusFromApi(raw.status),
    owner: (raw.owner || 'AI') as ConversationOwner,
    conversationState: raw.context_status as ConversationState,
    messageCount: raw.message_count || 0,
    is_favorite: Boolean(raw.is_favorite),
    isFavorite: Boolean(raw.is_favorite),
    createdAt: new Date(raw.started_at || raw.created_at),
    updatedAt: latestActivityDate(raw.updated_at, raw.last_message_at, raw.started_at),
  };
}

// ====================
// Core API Functions
// ====================

/**
 * Extended filters type that includes a backend channel override.
 * channel: 'personal' → always route to LAD_backend (Baileys / personal WA)
 * channel: 'waba'     → always route to LAD-WABA-Comms (Meta Business API)
 * When omitted, falls back to proxyClient's localStorage heuristic.
 */
export interface ConversationQueryOptions extends ConversationListFilters {
  backendChannel?: 'personal' | 'waba';
}

/**
 * Get all conversations with optional filters and pagination
 */
export async function getConversations(
  filters?: ConversationQueryOptions
): Promise<{ conversations: Conversation[]; total: number; hasMore: boolean }> {
  const { backendChannel, ...rest } = filters ?? {};
  const params: Record<string, string> = {};

  // Set default pagination if not provided
  const limit = rest.limit ?? 20;
  const offset = rest.offset ?? 0;

  params.limit = String(limit);
  params.offset = String(offset);

  if (rest.search) params.search = rest.search;
  if (rest.status && rest.status !== 'all') {
    params.status = rest.status === 'open' ? 'active' : rest.status;
  }
  if (rest.owner && rest.owner !== 'all') params.owner = rest.owner;
  if (rest.context_status) params.context_status = rest.context_status;
  // List-shaping params (default to "false" / "date" on the backend if omitted).
  if (rest.hide_empty) params.hide_empty = 'true';
  if (rest.sort_by) params.sort_by = rest.sort_by;
  if (rest.label_ids && rest.label_ids.length > 0) {
    params.label_ids = rest.label_ids.join(',');
  }

  const response = await proxyClient.get<{ success: boolean; data: any[]; total: number }>(
    '/api/whatsapp-conversations/conversations',
    { params, channel: backendChannel }
  );

  const total = response.data.total || 0;
  const conversations = (response.data.data || []).map(mapConversationFromApi);
  const hasMore = offset + limit < total;

  return { conversations, total, hasMore };
}

export interface ConversationsPage {
  conversations: Conversation[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
}

const PAGE_SIZE = 20;

/**
 * Fetch a single page of conversations for infinite scroll.
 */
export async function getConversationsPage(
  filters: ConversationQueryOptions,
  offset: number,
): Promise<ConversationsPage> {
  const { backendChannel, ...rest } = filters;
  const params: Record<string, string> = {
    limit: String(PAGE_SIZE),
    offset: String(offset),
  };
  if (rest.search) params.search = rest.search;
  if (rest.status && rest.status !== 'all') {
    params.status = rest.status === 'open' ? 'active' : rest.status;
  }
  if (rest.owner && rest.owner !== 'all') params.owner = rest.owner;
  if (rest.context_status) params.context_status = rest.context_status;
  if (rest.hide_empty) params.hide_empty = 'true';
  if (rest.sort_by) params.sort_by = rest.sort_by;
  if (rest.label_ids && rest.label_ids.length > 0) {
    params.label_ids = rest.label_ids.join(',');
  }

  const response = await proxyClient.get<{
    success: boolean;
    data: any[];
    total: number;
    has_more: boolean;
  }>('/api/whatsapp-conversations/conversations', { params, channel: backendChannel });

  const conversations = (response.data.data || []).map(mapConversationFromApi);
  const total: number = response.data.total ?? conversations.length;
  const hasMore: boolean = response.data.has_more ?? (offset + conversations.length < total);
  return { conversations, total, hasMore, nextOffset: offset + conversations.length };
}

/**
 * TanStack Query infinite options for conversations list (incremental loading).
 */
export const getConversationsInfiniteOptions = (filters?: ConversationQueryOptions) =>
  infiniteQueryOptions({
    queryKey: [...conversationKeys.list(filters), filters?.backendChannel ?? 'personal', 'infinite'],
    queryFn: ({ pageParam }: { pageParam: number }) =>
      getConversationsPage(filters ?? {}, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage: ConversationsPage) =>
      lastPage.hasMore ? lastPage.nextOffset : undefined,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30000,
  });

/**
 * TanStack Query options for getting conversations.
 * channel is included in the query key so personal/waba instances never share cache.
 */
export const getConversationsOptions = (filters?: ConversationQueryOptions) =>
  queryOptions({
    queryKey: [...conversationKeys.list(filters), filters?.backendChannel ?? 'personal'],
    queryFn: () => getConversations(filters),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchInterval: 15000,
  });

/**
 * Get a single conversation by ID
 */
export async function getConversation(conversationId: string): Promise<Conversation> {
  const response = await proxyClient.get<{ success: boolean; data: any }>(
    `/api/whatsapp-conversations/conversations/${conversationId}`
  );
  return mapConversationFromApi(response.data.data);
}

/**
 * TanStack Query options for getting a single conversation
 */
export const getConversationOptions = (conversationId: string) =>
  queryOptions({
    queryKey: conversationKeys.detail(conversationId),
    queryFn: () => getConversation(conversationId),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!conversationId,
  });

/**
 * Deduplicate messages: remove near-duplicate entries that share the same
 * content, direction (isOutgoing), and fall within a 10-second window.
 * This guards against historical DB duplicates created by the old TOCTOU
 * webhook-dedup race condition before it was fixed with try_claim().
 */
function deduplicateMessages(messages: Message[]): Message[] {
  const seen = new Map<string, number>(); // key → first-seen timestamp (ms)
  return messages.filter((msg) => {
    // Build a key that identifies "same content sent in roughly the same moment"
    // 1-second bucket - tight enough to catch real DB duplicates without
    // incorrectly merging legitimately different messages sent 1-2s apart
    const bucketKey = `${msg.isOutgoing ? 'out' : 'in'}|${msg.content}|${Math.floor(msg.timestamp.getTime() / 1000)}`;
    if (seen.has(bucketKey)) {
      return false; // near-duplicate - skip
    }
    seen.set(bucketKey, msg.timestamp.getTime());
    return true;
  });
}

/**
 * Get messages for a conversation with pagination
 */
export async function getConversationMessages(
  conversationId: string,
  pagination?: { limit?: number; offset?: number },
  backendChannel?: 'personal' | 'waba'
): Promise<{ messages: Message[]; total: number; hasMore: boolean; isAgentTyping: boolean }> {
  const params: Record<string, string> = {};
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);

  const response = await proxyClient.get<{
    success: boolean;
    data: any[];
    total: number;
    has_more: boolean;
  }>(`/api/whatsapp-conversations/conversations/${conversationId}/messages`, { params, channel: backendChannel });

  const rawMessages = (response.data.data || []).map(mapMessageFromApi);
  // Backend returns oldest-first (ORDER BY created_at ASC) - no reverse needed.
  const messages = deduplicateMessages(rawMessages);

  return {
    messages,
    total: response.data.total || 0,
    hasMore: response.data.has_more || false,
    isAgentTyping: !!(response.data as any).is_agent_typing,
  };
}

/**
 * TanStack Query options for getting conversation messages
 */
export const getConversationMessagesOptions = (
  conversationId: string,
  pagination?: { limit?: number; offset?: number },
  backendChannel?: 'personal' | 'waba'
) =>
  queryOptions({
    queryKey: [...conversationKeys.messages(conversationId, pagination), backendChannel ?? 'default'],
    queryFn: () => getConversationMessages(conversationId, pagination, backendChannel),
    staleTime: 0, // always re-fetch on next poll cycle
    gcTime: 5 * 60 * 1000,
    enabled: !!conversationId,
    refetchInterval: 3000, // Poll every 3 seconds for near-real-time updates
  });

// ====================
// Mutation Functions
// ====================

const MEDIA_TYPES = ['image', 'video', 'audio', 'document'] as const;

/**
 * Upload a media file (multipart) to get a media reference.
 * This bypasses JSON body size limits - suitable for large PDFs, videos, etc.
 * - WABA channel: uploads to Meta via Python service, returns a numeric media_id
 * - Personal channel: uploads to LAD_backend local/GCP storage, returns a file URL
 */
async function uploadMediaForMessage(file: File, channel?: string): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const uploadUrl = channel === 'personal'
    ? '/api/whatsapp-conversations/conversations/upload-media?channel=personal'
    : '/api/whatsapp-conversations/conversations/upload-media';

  const headers: Record<string, string> = {};
  if (typeof window !== 'undefined') {
    const token = safeStorage.getItem('token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const selectedTenantId = safeStorage.getItem('selectedTenantId') || '';
    const rawUser = safeStorage.getItem('user');
    let userTenantId = '';
    if (rawUser) {
      try {
        const parsedUser = JSON.parse(rawUser);
        userTenantId = parsedUser?.tenantId || parsedUser?.organizationId || '';
      } catch {
        userTenantId = '';
      }
    }

    const effectiveTenantId = selectedTenantId && selectedTenantId !== 'default'
      ? selectedTenantId
      : userTenantId;

    if (effectiveTenantId) {
      headers['X-Tenant-ID'] = effectiveTenantId;
    }
  }

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const errorMessage = err?.detail || err?.error || err?.message || `Media upload failed (${res.status})`;
    console.error('[uploadMediaForMessage] Upload failed:', {
      status: res.status,
      statusText: res.statusText,
      error: err,
      uploadUrl,
      channel,
    });
    throw new Error(errorMessage);
  }

  const data = await res.json();
  if (!data?.media_id) {
    console.error('[uploadMediaForMessage] No media_id in response:', data);
    throw new Error('No media_id returned from upload');
  }
  return data.media_id as string;
}

/**
 * Send a human agent message.
 * For media types (image/video/audio/document), the file is pre-uploaded to WhatsApp
 * as multipart to avoid JSON body size limits, and only the media_id is sent in the
 * message payload.
 */
export async function sendMessage(data: SendMessageRequest): Promise<Message> {
  let mediaId: string | undefined = data.mediaId;
  // For personal channel, the pre-uploaded reference is a file URL, not a Meta media_id
  let fileUrl: string | undefined;

  // Pre-upload large media files to avoid JSON body size limits (~8MB cap).
  // - WABA: uploads to Meta → returns media_id (numeric string)
  // - Personal: uploads to LAD_backend local/GCP storage → returns file URL
  if (
    data.type &&
    (MEDIA_TYPES as readonly string[]).includes(data.type) &&
    data.fileBase64 &&
    !mediaId
  ) {
    try {
      // Convert base64 back to a File object for multipart upload
      const b64 = data.fileBase64.includes(',')
        ? data.fileBase64.split(',')[1]
        : data.fileBase64;
      const byteChars = atob(b64);
      const byteArr = new Uint8Array(byteChars.length);
      for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
      const blob = new Blob([byteArr], { type: data.contentType || 'application/octet-stream' });
      const file = new File([blob], data.filename || 'upload', { type: blob.type });

      const uploadedRef = await uploadMediaForMessage(file, data.channel);

      if (data.channel === 'personal') {
        // Personal channel returns a file URL reference, not a Meta media_id
        fileUrl = uploadedRef;
      } else {
        mediaId = uploadedRef;
      }
    } catch (uploadErr) {
      console.error('[sendMessage] Media pre-upload failed, falling back to base64:', uploadErr);
      // Fall through - will try sending with file_base64 (may fail for very large files)
    }
  }

  const response = await proxyClient.post<{ success: boolean; data: any }>(
    `/api/whatsapp-conversations/conversations/${data.conversationId}/messages`,
    {
      // Core - always send `content` key so backend body.get("content") never returns None
      type:           data.type ?? 'text',
      content:        data.content ?? '',
      lead_id:        data.leadId,
      phone_number:   data.phoneNumber,
      human_agent_id: data.humanAgentId,
      // Media - for WABA: send media_id if pre-uploaded; for personal: send file_url
      // Fall back to file_base64 if pre-upload failed (will fail for >10MB files)
      media_id:       mediaId,
      file_url:       fileUrl,
      file_base64:    (mediaId || fileUrl) ? undefined : data.fileBase64,
      filename:       data.filename,
      content_type:   data.contentType,
      caption:        data.caption,
      // Location
      latitude:       data.latitude,
      longitude:      data.longitude,
      location_name:  data.locationName,
      location_address: data.locationAddress,
      // Contact
      contact_name:    data.contactName,
      contact_phone:   data.contactPhone,
      contact_email:   data.contactEmail,
      contact_company: data.contactCompany,
      // Poll
      poll_question:  data.pollQuestion,
      poll_options:   data.pollOptions,
    },
    { channel: data.channel }
  );
  return mapMessageFromApi(response.data.data);
}

/**
 * Mark a conversation as read - resets unread_count to 0 in the DB.
 * The GET /conversations/:id endpoint resets unread_count as a side effect.
 */
export async function markConversationRead(
  conversationId: string,
  backendChannel?: 'personal' | 'waba'
): Promise<void> {
  await proxyClient.get(
    `/api/whatsapp-conversations/conversations/${conversationId}`,
    { channel: backendChannel }
  );
}

/**
 * Update conversation status (resolve, mute, reopen)
 */
export async function updateConversationStatus(
  conversationId: string,
  status: ConversationStatus
): Promise<void> {
  const apiStatus = status === 'open' ? 'active' : status;
  await proxyClient.patch(`/api/whatsapp-conversations/conversations/${conversationId}/status`, {
    status: apiStatus,
  });
}

// ====================
// Analytics
// ====================

/**
 * Get conversation analytics/stats
 */
export async function getConversationStats(): Promise<ConversationStats> {
  const response = await proxyClient.get<any>('/api/whatsapp-conversations/analytics');
  const data = response.data;
  return {
    totalConversations: data.total_conversations || 0,
    activeConversations: data.active_conversations || 0,
    resolvedConversations: data.resolved_conversations || 0,
    avgResponseTimeMs: data.avg_response_time_ms || 0,
    totalMessages: data.total_messages || 0,
  };
}

export const getConversationStatsOptions = () =>
  queryOptions({
    queryKey: conversationKeys.stats(),
    queryFn: getConversationStats,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
