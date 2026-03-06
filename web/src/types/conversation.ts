/**
 * Conversation Types - Re-exports from SDK + web-specific types
 *
 * The SDK types are the authoritative source.
 * Web-specific types (ContactTag, InternalComment) are defined here.
 */
export type {
  Channel,
  ConversationStatus,
  MessageStatus,
  ConversationOwner,
  ConversationState,
  Message,
  Attachment,
  ConversationListFilters,
  SendMessageRequest,
  ConversationStats,
} from '@lad/frontend-features/conversations';

// Re-export Contact and Conversation with web-specific extensions
import type {
  Contact as SDKContact,
  Conversation as SDKConversation,
} from '@lad/frontend-features/conversations';

// Web-specific types not in SDK
export type ContactTag = 'hot' | 'warm' | 'cold';

export interface Label {
  id: string;
  name: string;
  color: string;
  created_at?: string;
}

export interface QuickReply {
  id: string;
  title: string;
  shortcut: string | null;
  content: string;
  category: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ConversationNote {
  id: string;
  conversation_id: string;
  lead_id: string | null;
  content: string;
  author_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface Contact extends SDKContact {
  position?: string;
  tags: ContactTag[];
  notes: string[];
  lastSeen?: Date;
  isOnline?: boolean;
}

export interface Conversation extends SDKConversation {
  contact: Contact;
  assignedTo?: string;
  is_favorite?: boolean;
  is_pinned?: boolean;
  is_locked?: boolean;
  labels?: Label[];
  context_status?: string | null;
}

export interface InternalComment {
  id: string;
  conversationId: string;
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  timestamp: Date;
}
