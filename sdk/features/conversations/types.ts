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
  /** Template name if this message was sent via a WhatsApp template */
  templateName?: string;

  // ── Location message fields ──────────────────────────────────────────────
  /** GPS latitude for location messages */
  latitude?: number;
  /** GPS longitude for location messages */
  longitude?: number;
  /** Location name or label (e.g. "HAY AL NAHDA") */
  locationName?: string;
  /** Location address string */
  locationAddress?: string;
}

export interface Attachment {
  id: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'audio';
  name: string;
  size?: number;
}

// ── Rich message types ────────────────────────────────────────────────────────

export type RichMessageType =
  | 'text'
  | 'image'
  | 'video'
  | 'document'
  | 'audio'
  | 'location'
  | 'contact'
  | 'poll';

export interface RichMessagePayload {
  type: RichMessageType;

  /** Plain text content — required for 'text', optional caption for media */
  content?: string;

  // ── Media (image / video / document / audio) ────────────────────────────
  fileBase64?: string;
  filename?: string;
  contentType?: string;
  caption?: string;

  // ── Location ──────────────────────────────────────────────────────────
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;

  // ── Contact card ──────────────────────────────────────────────────────
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactCompany?: string;

  // ── Poll ──────────────────────────────────────────────────────────────
  pollQuestion?: string;
  pollOptions?: string[];
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
  leadId: string;
  phoneNumber?: string;
  humanAgentId?: string;
  channel?: 'personal' | 'waba';

  // Rich payload — all fields from RichMessagePayload forwarded to backend
  type?: RichMessageType;
  content?: string;
  fileBase64?: string;
  filename?: string;
  contentType?: string;
  caption?: string;
  latitude?: number;
  longitude?: number;
  locationName?: string;
  locationAddress?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  contactCompany?: string;
  pollQuestion?: string;
  pollOptions?: string[];
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
  sendMessage: (payload: RichMessagePayload) => void;
  markAsResolved: (id: string) => void;
  muteConversation: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}
