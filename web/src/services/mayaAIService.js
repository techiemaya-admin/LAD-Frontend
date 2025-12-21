/**
 * Maya AI Service - lad_ui compatibility wrapper
 * This is a thin wrapper that connects the framework-agnostic AI ICP Assistant
 * feature to the Next.js application's API client
 */

import api from './api';
import { createAIICPAssistantService } from '@/features/ai-icp-assistant';

// Create service instance with lad_ui's API client
const aiICPAssistant = createAIICPAssistantService(api);

// Export as mayaAIService for backward compatibility with existing code
export const mayaAIService = {
  chat: (message, conversationHistory = [], searchResults = []) => 
    aiICPAssistant.chat(message, conversationHistory, searchResults),
  
  reset: () => aiICPAssistant.reset(),
  
  getHistory: () => aiICPAssistant.getHistory(),
  
  // New: Expand keywords using AI
  expandKeywords: async (topic) => {
    try {
      const response = await api.post('/api/ai-icp-assistant/expand-keywords', { topic });
      return response.data;
    } catch (error) {
      console.error('Error expanding keywords:', error);
      throw error;
    }
  }
};

