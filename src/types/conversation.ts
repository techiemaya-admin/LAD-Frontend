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
