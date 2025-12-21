/**
 * Maya AI Service
 * Enhanced AI assistant for ICP definition and company searches
 */

import api from './api';

export interface MayaAIChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface MayaAISuggestedParams {
  searchType: 'company' | 'employee';
  keywords?: string;
  location?: string;
  companySize?: string;
  revenue?: string;
  jobTitles?: string[];
  personTitles?: string[];
  companyKeywords?: string;
  autoExecute?: boolean;
}

export interface MayaAIActionResult {
  type: 'collect_numbers' | 'filter' | 'prepare_calling' | 'search_employees' | 'other';
  data: any[];
  count: number;
}

export interface MayaAIChatResponse {
  success: boolean;
  response: string;
  suggestedParams?: MayaAISuggestedParams;
  shouldScrape?: boolean;
  autoSearchExecuted?: boolean;
  actionResult?: MayaAIActionResult;
}

class MayaAIService {
  private baseUrl: string;

  constructor() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
    this.baseUrl = `${backendUrl}/api/ai-icp-assistant`;
  }

  /**
   * Send message to Maya AI and get response
   * Supports both search parameter extraction and action commands
   */
  async chat(
    message: string, 
    conversationHistory: MayaAIChatMessage[] = [], 
    searchResults: any[] = []
  ): Promise<MayaAIChatResponse> {
    try {
      const response = await api.post(`${this.baseUrl}/chat`, {
        message,
        conversationHistory,
        searchResults  // Send current search results for action commands
      });
      return response.data;
    } catch (error: any) {
      console.error('Error chatting with Maya AI:', error);
      throw new Error(error.response?.data?.error || 'Failed to chat with Maya AI');
    }
  }

  /**
   * Reset conversation history
   */
  async resetConversation(): Promise<void> {
    try {
      await api.post(`${this.baseUrl}/reset`);
    } catch (error: any) {
      console.error('Error resetting conversation:', error);
      throw new Error(error.response?.data?.error || 'Failed to reset conversation');
    }
  }

  /**
   * Get chat history
   */
  async getChatHistory(): Promise<MayaAIChatMessage[]> {
    try {
      const response = await api.get(`${this.baseUrl}/history`);
      return response.data.history || [];
    } catch (error: any) {
      console.error('Error getting chat history:', error);
      return [];
    }
  }

  /**
   * Expand keywords using AI
   * Useful for Apollo searches to get better results
   */
  async expandKeywords(topic: string): Promise<string[]> {
    try {
      const response = await api.post(`${this.baseUrl}/expand-keywords`, {
        topic
      });
      return response.data.keywords || [];
    } catch (error: any) {
      console.error('Error expanding keywords:', error);
      throw new Error(error.response?.data?.error || 'Failed to expand keywords');
    }
  }

  /**
   * Get scraping suggestions based on business type
   * Legacy method - kept for compatibility
   */
  async getSuggestions(
    businessType: string, 
    targetAudience: string, 
    location: string
  ): Promise<any> {
    try {
      // Use chat endpoint with structured message
      const message = `I have a ${businessType} business targeting ${targetAudience} in ${location}. What companies should I search for?`;
      return await this.chat(message);
    } catch (error: any) {
      console.error('Error getting Maya AI suggestions:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const mayaAIService = new MayaAIService();

// Export class for testing
export default MayaAIService;
