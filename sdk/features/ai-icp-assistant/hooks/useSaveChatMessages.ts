/**
 * useSaveChatMessages Hook
 * 
 * Manages batch saving of chat messages to backend
 */
import { useState, useCallback } from 'react';
import { saveChatMessagesBatch, type BufferedMessage } from '../api';

export interface SaveChatMessagesState {
  isLoading: boolean;
  error: string | null;
  conversationId: string | null;
  savedCount: number;
  isSaved: boolean;
}

const initialState: SaveChatMessagesState = {
  isLoading: false,
  error: null,
  conversationId: null,
  savedCount: 0,
  isSaved: false,
};

export function useSaveChatMessages() {
  const [state, setState] = useState<SaveChatMessagesState>(initialState);

  /**
   * Reset the save state
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Save messages in batch
   */
  const saveMessages = useCallback(async (
    sessionId: string,
    messages: BufferedMessage[],
    conversationId?: string
  ) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const result = await saveChatMessagesBatch(sessionId, messages, conversationId);

      setState({
        isLoading: false,
        error: null,
        conversationId: result.conversationId,
        savedCount: result.savedCount,
        isSaved: true,
      });

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to save messages';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error,
        isSaved: false,
      }));
      throw err;
    }
  }, []);

  return {
    ...state,
    saveMessages,
    reset,
  };
}
