/**
 * Conversations Feature - Web Layer Barrel Re-export
 * 
 * This file serves as a barrel re-export of web-layer conversations functionality.
 * 
 * ARCHITECTURE NOTE: Per LAD Architecture Guidelines:
 * - Conversations state management lives in: web/src/store/slices/conversationSlice.ts
 * - UI components live in: web/src/components/conversations/
 * - Hooks live in: web/src/features/conversations/useConversations.ts
 * 
 * USAGE:
 * Import hook and types from here:
 * ```typescript
 * import { useConversations, type Conversation } from '@/features/conversations';
 * ```
 * 
 * Import UI components from web/src/components/conversations directly:
 * ```typescript
 * import { ConversationsPage } from '@/components/conversations';
 * ```
 */

// Re-export hook
export { useConversations } from './useConversations';
export type { UseConversationsReturn } from './useConversations';

// Re-export types from Redux slice
export type { Conversation, Message } from '@/store/slices/conversationSlice';
