/**
 * Conversations Feature - API Functions
 *
 * All HTTP API calls for the conversations feature.
 * Uses proxyClient (relative fetch) since these go through Next.js
 * API routes that proxy to Python services.
 *
 * Follows the same pattern as campaigns/api.ts for consistency.
 */
import { queryOptions } from '@tanstack/react-query';
import { proxyClient } from '../../shared/proxyClient';
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
  const role = raw.role || 'user';
  // Backend returns "AI" for agent messages, "user" for lead, "human_agent" for human takeover
  const isOutgoing = role === 'assistant' || role === 'AI' || role === 'human_agent';

  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    content: raw.content || '',
    timestamp: new Date(raw.created_at),
    isOutgoing,
    status: (raw.message_status || 'sent') as MessageStatus,
    sender: {
      id: isOutgoing ? 'agent' : raw.lead_id || 'user',
      name: isOutgoing ? (role === 'human_agent' ? 'Agent' : 'AI Agent') : 'Contact',
    },
    role,
    intent: raw.intent,
  };
}

function mapConversationFromApi(raw: any): Conversation {
  return {
    id: raw.id,
    leadId: raw.lead_id,
    channel: mapChannelFromApi(raw.lead_channel),
    contact: {
      id: raw.lead_id,
      name: raw.lead_name || 'Unknown',
      phone: raw.lead_phone,
      email: raw.lead_email,
    },
    messages: [], // Messages loaded separately
    lastMessage: raw.last_message_content
      ? {
          id: `last-${raw.id}`,
          conversationId: raw.id,
          content: raw.last_message_content,
          timestamp: new Date(raw.last_message_at || raw.updated_at),
          isOutgoing: raw.last_message_role !== 'user',
          status: 'sent',
          sender: {
            id: raw.last_message_role === 'user' ? raw.lead_id : 'agent',
            name: raw.last_message_role === 'user' ? (raw.lead_name || 'Contact') : 'AI Agent',
          },
        }
      : null,
    unreadCount: raw.unread_count || 0,
    status: mapStatusFromApi(raw.status),
    owner: (raw.owner || 'AI') as ConversationOwner,
    conversationState: raw.context_status as ConversationState,
    messageCount: raw.message_count || 0,
    createdAt: new Date(raw.started_at || raw.created_at),
    updatedAt: new Date(raw.updated_at || raw.last_message_at || raw.started_at),
  };
}

// ====================
// Core API Functions
// ====================

/**
 * Get all conversations with optional filters
 */
export async function getConversations(filters?: ConversationListFilters): Promise<Conversation[]> {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.status && filters.status !== 'all') {
    params.status = filters.status === 'open' ? 'active' : filters.status;
  }
  if (filters?.owner && filters.owner !== 'all') params.owner = filters.owner;
  if (filters?.limit) params.limit = String(filters.limit);
  if (filters?.offset) params.offset = String(filters.offset);

  const response = await proxyClient.get<{ success: boolean; data: any[]; total: number }>(
    '/api/whatsapp-conversations/conversations',
    { params }
  );

  return (response.data.data || []).map(mapConversationFromApi);
}

/**
 * TanStack Query options for getting conversations
 */
export const getConversationsOptions = (filters?: ConversationListFilters) =>
  queryOptions({
    queryKey: conversationKeys.list(filters),
    queryFn: () => getConversations(filters),
    staleTime: 30 * 1000, // 30 seconds (conversations change frequently)
    gcTime: 5 * 60 * 1000,
    refetchInterval: 15000, // Poll every 15 seconds for new messages
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
 * Get messages for a conversation with pagination
 */
export async function getConversationMessages(
  conversationId: string,
  pagination?: { limit?: number; offset?: number }
): Promise<{ messages: Message[]; total: number; hasMore: boolean }> {
  const params: Record<string, string> = {};
  if (pagination?.limit) params.limit = String(pagination.limit);
  if (pagination?.offset) params.offset = String(pagination.offset);

  const response = await proxyClient.get<{
    success: boolean;
    data: any[];
    total: number;
    has_more: boolean;
  }>(`/api/whatsapp-conversations/conversations/${conversationId}/messages`, { params });

  return {
    messages: (response.data.data || []).map(mapMessageFromApi),
    total: response.data.total || 0,
    hasMore: response.data.has_more || false,
  };
}

/**
 * TanStack Query options for getting conversation messages
 */
export const getConversationMessagesOptions = (
  conversationId: string,
  pagination?: { limit?: number; offset?: number }
) =>
  queryOptions({
    queryKey: conversationKeys.messages(conversationId, pagination),
    queryFn: () => getConversationMessages(conversationId, pagination),
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000,
    enabled: !!conversationId,
    refetchInterval: 10000, // Poll every 10 seconds for new messages
  });

// ====================
// Mutation Functions
// ====================

/**
 * Send a human agent message
 */
export async function sendMessage(data: SendMessageRequest): Promise<Message> {
  const response = await proxyClient.post<{ success: boolean; data: any }>(
    `/api/whatsapp-conversations/conversations/${data.conversationId}/messages`,
    {
      content: data.content,
      lead_id: data.leadId,
      phone_number: data.phoneNumber,
      human_agent_id: data.humanAgentId,
    }
  );
  return mapMessageFromApi(response.data.data);
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
