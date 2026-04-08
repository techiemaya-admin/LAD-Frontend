/**
 * Conversations Feature - Type Definitions
 *
 * Central location for all conversations-related TypeScript interfaces.
 */

// ============================
// Enums / Union Types
// ============================

export type Channel = 'whatsapp' | 'linkedin' | 'gmail' | 'outlook' | 'instagram';
export type ConversationStatus = 'open' | 'resolved' | 'muted';
export type MessageStatus = 'sent' | 'delivered' | 'read' | 'failed';
export type ConversationOwner = 'AI' | 'human_agent';
/** Context status from bni_conversation_manager — dynamic per tenant */
export type ConversationState = string;

// ============================
// Core Interfaces
// ============================

export interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  avatar?: string;
}

export interface Message {
  id: string;
  conversationId: string;
  content: string;
  timestamp: Date;
  isOutgoing: boolean;
  status: MessageStatus;
  sender: {
    id: string;
    name: string;
  };
  attachments?: Attachment[];
  /** 'user' = lead | 'assistant' = AI | 'human_agent' = human takeover */
  role?: string;
  intent?: string;
  /** Display name of the human agent who sent this message (if role='human_agent') */
  senderName?: string;
  /** User ID of the human agent (if stored in message metadata) */
  humanAgentId?: string;
}

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'document' | 'video';
  name: string;
}

export interface Conversation {
  id: string;
  contact: Contact;
  channel: Channel;
  messages: Message[];
  lastMessage: Message | null;
  unreadCount: number;
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
  owner?: ConversationOwner;
  conversationState?: ConversationState;
  leadId?: string;
  messageCount?: number;
}

// ============================
// API Request/Response Types
// ============================

export interface ConversationListFilters {
  status?: ConversationStatus | 'all';
  channel?: Channel | 'all';
  search?: string;
  owner?: ConversationOwner | 'all';
  context_status?: string;
  limit?: number;
  offset?: number;
}

export interface MessageListResponse {
  messages: Message[];
  total: number;
  hasMore: boolean;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  leadId: string;
  phoneNumber?: string;
  humanAgentId?: string;
}

export interface ConversationStats {
  totalConversations: number;
  activeConversations: number;
  resolvedConversations: number;
  avgResponseTimeMs: number;
  totalMessages: number;
}

// ============================
// Hook Return Types
// ============================

export interface UseConversationsReturn {
  conversations: Conversation[];
  allConversations: Conversation[];
  selectedConversation: Conversation | null;
  selectedId: string | null;
  selectConversation: (id: string) => void;
  channelFilter: Channel | 'all';
  setChannelFilter: (filter: Channel | 'all') => void;
  contextStatusFilter: string;
  setContextStatusFilter: (filter: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  unreadCounts: {
    all: number;
    whatsapp: number;
    linkedin: number;
    gmail: number;
  };
  sendMessage: (content: string) => void;
  markAsResolved: (id: string) => void;
  muteConversation: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
