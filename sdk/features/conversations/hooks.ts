/**
 * Conversations Feature - Hooks Barrel Export
 *
 * Re-exports all hooks from the hooks/ directory.
 * The main useConversations hook preserves backward compatibility.
 */
export { useConversations } from './hooks/useConversationManager';
export { useConversationMessages } from './hooks/useConversationMessages';
export { useSendMessage } from './hooks/useSendMessage';
export { useConversationStats } from './hooks/useConversationStats';

export type { UseConversationMessagesReturn } from './hooks/useConversationMessages';
export type { UseSendMessageReturn } from './hooks/useSendMessage';
export type { UseConversationStatsReturn } from './hooks/useConversationStats';
