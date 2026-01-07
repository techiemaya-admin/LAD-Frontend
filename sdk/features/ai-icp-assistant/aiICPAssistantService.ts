/**
 * AI ICP Assistant Service
 * Framework-agnostic service for AI-powered ICP definition and search guidance
 */

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface ICPData {
  industry?: string;
  company_size?: string;
  location?: string;
  revenue?: string;
  technologies?: string[];
  [key: string]: any;
}

export interface ChatResponse {
  success: boolean;
  message: string;
  icpData: ICPData;
  searchReady: boolean;
  searchParams: any | null;
  conversationHistory: ChatMessage[];
  suggestions?: string[];
}

export interface AIICPAssistantAPI {
  chat(message: string, conversationHistory?: ChatMessage[], searchResults?: any[]): Promise<ChatResponse>;
  reset(): Promise<{ success: boolean; message: string }>;
  getHistory(): Promise<{ success: boolean; history: ChatMessage[] }>;
}

export class AIICPAssistantService implements AIICPAssistantAPI {
  private apiClient: any;

  constructor(apiClient: any) {
    this.apiClient = apiClient;
  }

  /**
   * Send message to AI ICP Assistant and get response
   */
  async chat(
    message: string, 
    conversationHistory: ChatMessage[] = [], 
    searchResults: any[] = []
  ): Promise<ChatResponse> {
    try {
      const response = await this.apiClient.post('/api/ai-icp-assistant/chat', {
        message,
        conversationHistory,
        searchResults
      });
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error chatting with AI ICP Assistant:', error);
      }
      throw new Error('Failed to send message to AI ICP Assistant');
    }
  }

  /**
   * Reset conversation history
   */
  async reset(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.apiClient.post('/api/ai-icp-assistant/reset');
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error resetting conversation:', error);
      }
      throw new Error('Failed to reset conversation');
    }
  }

  /**
   * Get conversation history
   */
  async getHistory(): Promise<{ success: boolean; history: ChatMessage[] }> {
    try {
      const response = await this.apiClient.get('/api/ai-icp-assistant/history');
      return response.data;
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error getting conversation history:', error);
      }
      throw new Error('Failed to get conversation history');
    }
  }
}

// Factory function for creating service instance
export function createAIICPAssistantService(apiClient: any): AIICPAssistantService {
  return new AIICPAssistantService(apiClient);
}
