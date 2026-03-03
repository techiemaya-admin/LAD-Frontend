/**
 * Conversations Feature - SDK Exports
 *
 * Central export point for all conversations-related functionality.
 *
 * USAGE:
 * ```typescript
 * import { useConversations, type Conversation } from '@/sdk/features/conversations';
 * ```
 */

// API Functions
export {
  getConversations,
  getConversation,
  getConversationMessages,
  sendMessage,
  updateConversationStatus,
  getConversationStats,
  getConversationsOptions,
  getConversationOptions,
  getConversationMessagesOptions,
  getConversationStatsOptions,
  conversationKeys,
} from './api';

// Hooks
export {
  useConversations,
  useConversationMessages,
  useSendMessage,
  useConversationStats,
} from './hooks';

export type {
  UseConversationMessagesReturn,
  UseSendMessageReturn,
  UseConversationStatsReturn,
} from './hooks';

// Types
export type {
  Channel,
  ConversationStatus,
  MessageStatus,
  ConversationOwner,
  ConversationState,
  Contact,
  Message,
  Attachment,
  Conversation,
  ConversationListFilters,
  MessageListResponse,
  SendMessageRequest,
  ConversationStats,
  UseConversationsReturn,
} from './types';
