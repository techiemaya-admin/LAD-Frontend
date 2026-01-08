import { createSlice, createSelector, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { markConversationAsRead } from './notificationSlice';
import { AppDispatch, RootState } from '../store';
import { logger } from '@/lib/logger';

interface Message {
  id?: string | number;
  [key: string]: unknown;
}

interface Conversation {
  id: string | number;
  leadId?: string | number;
  unread?: number;
  unreadCount?: number;
  lastMessage?: unknown;
  lastMessageTime?: string | number;
  updatedAt?: string | number;
  createdAt?: string | number;
  owner?: string | null;
  humanAgentId?: string | number | null;
  [key: string]: unknown;
}

interface ConversationState {
  conversations: Conversation[];
  messages: Record<string | number, Message[]>;
  pagination: Record<string | number, {
    hasMore: boolean;
    loading: boolean;
  }>;
  loading: boolean;
  error: string | null;
  activeConversationId: string | number | null;
}

interface AddMessagePayload {
  conversationId: string | number;
  message?: Message;
  messages?: Message[];
  isActive?: boolean;
  clear?: boolean;
}

interface SetPaginationPayload {
  conversationId: string | number;
  hasMore?: boolean;
  loading?: boolean;
}

// Memoized selector for a single conversation by ID
export const makeSelectConversationById = () =>
  createSelector(
    [(state: RootState) => (state.conversation as ConversationState).conversations, (state: RootState, conversationId?: string | number) => conversationId],
    (conversations: Conversation[], conversationId?: string | number): Conversation | null => {
      if (!conversationId) return null;
      return conversations.find(c => String(c.id) === String(conversationId)) || null;
    }
  );

// Memoized selector for messages by conversation ID
export const makeSelectMessagesByConversation = () =>
  createSelector(
    [(state: RootState) => (state.conversation as ConversationState).messages, (state: RootState, conversationId: string | number) => conversationId],
    (messages: Record<string | number, Message[]>, conversationId: string | number): Message[] => messages[conversationId] || []
  );

// Initial state for conversations
const initialState: ConversationState = {
  conversations: [], // [{...conversation, unread, lastMessage}]
  messages: {}, // { [conversationId]: [msg, ...] }
  pagination: {}, // { [conversationId]: { hasMore, loading } }
  loading: false,
  error: null,
  activeConversationId: null, // Track which conversation is open in the UI
};

const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    // Prepend older messages for infinite scroll
    prependMessagesToConversation: (state, action: PayloadAction<{ conversationId: string | number; messages: Message[] }>) => {
      const { conversationId, messages } = action.payload;
      if (!conversationId || !Array.isArray(messages) || !messages.length) return;
      if (!state.messages[conversationId]) state.messages[conversationId] = [];
      // Avoid duplicates: only add messages not already present
      const existingIds = new Set(state.messages[conversationId].map(m => m.id));
      const newMessages = messages.filter(m => !existingIds.has(m.id));
      state.messages[conversationId] = [...newMessages, ...state.messages[conversationId]];
    },
    // Set pagination state for a conversation
    setPagination: (state, action: PayloadAction<SetPaginationPayload>) => {
      const { conversationId, hasMore, loading } = action.payload;
      if (!conversationId) return;
      if (!state.pagination[conversationId]) state.pagination[conversationId] = { hasMore: true, loading: false };
      if (typeof hasMore === 'boolean') state.pagination[conversationId].hasMore = hasMore;
      if (typeof loading === 'boolean') state.pagination[conversationId].loading = loading;
    },
    // Set all conversations (initialize unread and lastMessage if not present)
    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      // Merge new conversations with existing, preserving static fields if new values are null/empty
      const incoming = action.payload || [];
      const existingById: Record<string, Conversation> = {};
      state.conversations.forEach(c => { existingById[String(c.id)] = c; });
      state.conversations = incoming.map(conv => {
        const prev = existingById[String(conv.id)] || {} as Conversation;
        return {
          ...prev,
          ...conv,
          owner: (conv.owner !== null && conv.owner !== undefined && conv.owner !== '') ? conv.owner : prev.owner,
          humanAgentId: conv.humanAgentId !== undefined ? conv.humanAgentId : prev.humanAgentId,
          unread: typeof conv.unread === 'number' ? conv.unread : (typeof prev.unread === 'number' ? prev.unread : 0),
          lastMessage: conv.lastMessage || prev.lastMessage || null,
          lastMessageTime: conv.lastMessageTime || conv.updatedAt || conv.createdAt || prev.lastMessageTime || null,
        };
      });
    },
    // Update or insert a single conversation (merge unread and lastMessage)
    updateConversation: (state, action: PayloadAction<Partial<Conversation> & { id: string | number }>) => {
      const updated = action.payload;
      const idx = state.conversations.findIndex(c => String(c.id) === String(updated.id));
      if (idx !== -1) {
        // Only update lead and owner for existing conversations
        const prev = state.conversations[idx];
        state.conversations[idx] = {
          ...prev,
          unread: typeof updated.unread === 'number' ? updated.unread : prev.unread,
          lastMessage: updated.lastMessage || prev.lastMessage,
          lastMessageTime: updated.lastMessageTime || updated.updatedAt || updated.createdAt || prev.lastMessageTime || null,
          owner: (updated.owner !== null && updated.owner !== undefined && updated.owner !== '') ? updated.owner : prev.owner,
          humanAgentId: updated.humanAgentId !== undefined ? updated.humanAgentId : prev.humanAgentId,
        };
      } else {
        state.conversations.unshift({
          ...updated,
          unread: typeof updated.unread === 'number' ? updated.unread : 0,
          lastMessage: updated.lastMessage || null,
          lastMessageTime: updated.lastMessageTime || updated.updatedAt || updated.createdAt || null,
          owner: updated.owner !== undefined ? updated.owner : null,
          humanAgentId: updated.humanAgentId !== undefined ? updated.humanAgentId : null,
        } as Conversation);
      }
    },
    // Add a new message to a conversation and update unread/lastMessage
    addMessageToConversation: (state, action: PayloadAction<AddMessagePayload>) => {
      const { conversationId, message, isActive, clear } = action.payload;
      if (!conversationId) return;
      
      // Handle clear flag
      if (clear) {
        state.messages[conversationId] = [];
        return;
      }
      
      // Handle messages array
      if (action.payload.messages && Array.isArray(action.payload.messages)) {
        if (!state.messages[conversationId]) state.messages[conversationId] = [];
        state.messages[conversationId] = [...state.messages[conversationId], ...action.payload.messages];
        return;
      }
      
      if (!message) return;
      // 1. Update messages array first
      if (!state.messages[conversationId]) state.messages[conversationId] = [];
      const msgIdx = state.messages[conversationId].findIndex(m => m.id === message.id);
      if (msgIdx !== -1) {
        // Replace existing message with new one
        state.messages[conversationId][msgIdx] = message;
      } else {
        // Add new message
        state.messages[conversationId].push(message);
      }
      // 2. Update conversation object fields
      const idx = state.conversations.findIndex(c => String(c.id) === String(conversationId));
      if (idx !== -1) {
        state.conversations[idx].lastMessage = message;
        if (!isActive) {
          state.conversations[idx].unread = (state.conversations[idx].unread || 0) + 1;
        }
      }
    },
    // Mark a conversation as read (set unread to 0)
    markConversationRead: (state, action: PayloadAction<string | number>) => {
      const conversationId = action.payload;
      const idx = state.conversations.findIndex(c => String(c.id) === String(conversationId));
      if (idx !== -1) {
        state.conversations[idx].unread = 0;
      }
      
      // Also mark all notifications for this conversation as read
      // Note: This will be handled by the component that calls markConversationRead
      // by dispatching markConversationAsRead to the notification slice
    },
    // Clear all messages for a conversation (e.g., on conversation switch)
    clearMessages: (state, action: PayloadAction<string | number | undefined>) => {
      const conversationId = action?.payload;
      if (conversationId) {
        state.messages[conversationId] = [];
      } else {
        state.messages = {};
      }
    },
    // Set loading state for async operations
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    // Set the active conversation (called when user opens a chat window)
    setActiveConversation: (state, action: PayloadAction<string | number | null>) => {
      state.activeConversationId = action.payload;
      // Mark as read when opening - this will be handled by the unified action
      if (action.payload) {
        const idx = state.conversations.findIndex(c => String(c.id) === String(action.payload));
        if (idx !== -1) {
          state.conversations[idx].unread = 0;
        }
      }
    }
  }
});

// Export actions for use in components
export const {
  setConversations,
  updateConversation,
  addMessageToConversation,
  prependMessagesToConversation,
  markConversationRead,
  clearMessages,
  setLoading,
  setError,
  setActiveConversation,
  setPagination
} = conversationSlice.actions;

// Selector for active conversation id
export const selectActiveConversationId = (state: RootState): string | number | null => 
  (state.conversation as ConversationState).activeConversationId;

// Memoized selector for conversations
// Use a direct selector for conversations (no memoization needed for identity)
export const selectConversations = (state: RootState): Conversation[] => 
  (state.conversation as ConversationState).conversations;

// selectNotifications removed: use notificationSlice instead
export const selectMessagesByConversation = createSelector(
  [(state: RootState) => (state.conversation as ConversationState).messages, (state: RootState, conversationId: string | number) => conversationId],
  (messages: Record<string | number, Message[]>, conversationId: string | number): Message[] => messages[conversationId] || []
);

export const selectConversationLoading = (state: RootState): boolean => 
  (state.conversation as ConversationState).loading;

export const selectConversationError = (state: RootState): string | null => 
  (state.conversation as ConversationState).error;

// Selector for filtering conversations by user's assigned leads
export const selectConversationsByUserLeads = createSelector(
  [selectConversations, (state: RootState, userLeads: Array<{ id: string | number }>) => userLeads],
  (conversations: Conversation[], userLeads: Array<{ id: string | number }>): Conversation[] => {
    // If user has assigned leads, filter conversations
    if (userLeads && userLeads.length > 0) {
      const userLeadIds = new Set(userLeads.map(lead => String(lead.id)));
      return conversations.filter(conversation =>
        conversation.leadId && userLeadIds.has(String(conversation.leadId))
      );
    } else {
      // Return all conversations if no leads assigned
      return conversations;
    }
  }
);

// Unified action to mark conversation as read in both slices
export const markConversationAsReadUnified = createAsyncThunk(
  'conversation/markAsReadUnified',
  async (conversationId: string | number, { dispatch }: { dispatch: AppDispatch }) => {
    // Update conversation slice
    dispatch(markConversationRead(conversationId));
    // Update notification slice
    dispatch(markConversationAsRead(conversationId));
    
    // Call backend API to mark conversation notifications as read
    try {
      // Note: notificationService is commented out in the original, so we'll skip it for now
      // const result = await notificationService.markConversationNotificationsRead(conversationId);
    } catch (error) {
      logger.warn('Error calling backend API for mark as read', error);
      // Don't throw error - frontend state is already updated
      // The user experience is not affected by backend API failures
    }
    
    return conversationId;
  }
);

export default conversationSlice.reducer;

