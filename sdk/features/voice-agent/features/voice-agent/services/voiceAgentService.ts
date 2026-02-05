import api from './api';
import { VoiceAgent, CallLog, PhoneNumber, BatchCallLogEntry } from '../types';

/**
 * Centralized logger - LAD Architecture Compliance
 * Import from web lib when available, fallback to console in SDK context
 */
const createLogger = () => {
  try {
    // Try to import centralized logger (when running in web context)
    const { logger } = require('@/lib/logger');
    return logger;
  } catch {
    // Fallback for SDK standalone context - minimal console wrapper
    return {
      debug: () => {}, // Silent in production
      info: (msg: string, data?: any) => process.env.NODE_ENV === 'development' && console.info(`[VoiceAgent] ${msg}`, data || ''),
      warn: (msg: string, data?: any) => process.env.NODE_ENV === 'development' && console.warn(`[VoiceAgent] ${msg}`, data || ''),
      error: (msg: string, data?: any) => console.error(`[VoiceAgent] ${msg}`, data || '')
    };
  }
};

const logger = createLogger();

/**
 * Voice Agent Service
 */
class VoiceAgentService {
  /**
   * Check if VAPI is disabled (VAPI service is disabled, but backend voice calling still works)
   */
  private isVAPIDisabled(): boolean {
    // VAPI service is disabled - backend uses its own voice calling mechanism
    return true;
  }

  /**
   * Safe API call wrapper that handles errors and disabled state
   */
  private async safeApiCall<T>(apiCall: () => Promise<T>, fallback: T, methodName: string): Promise<T> {
    try {
      return await apiCall();
    } catch (error: any) {
      // Enhanced error logging with response details
      // Build a clean error object to avoid circular references
      const errorDetails: any = {
        method: methodName,
        message: error?.message || String(error) || 'Unknown error',
        errorType: error?.constructor?.name || typeof error,
        isAxiosError: error?.isAxiosError,
        hasResponse: !!error?.response
      };

      // Add response details if available (avoid circular refs)
      if (error?.response) {
        errorDetails.status = error.response.status;
        errorDetails.statusText = error.response.statusText;
        // Only include serializable response data
        try {
          errorDetails.responseData = JSON.parse(JSON.stringify(error.response.data));
        } catch {
          errorDetails.responseData = String(error.response.data);
        }
      }

      // Add request details if available
      if (error?.config) {
        errorDetails.url = error.config.url;
        errorDetails.baseURL = error.config.baseURL;
        errorDetails.fullURL = `${error.config.baseURL || ''}${error.config.url || ''}`;
        errorDetails.method = error.config.method?.toUpperCase();
      }

      // Add network error details
      if (error?.code) {
        errorDetails.code = error.code;
      }

      // Check if it's a network error
      if (error?.request && !error?.response) {
        errorDetails.networkError = 'No response received from server';
        errorDetails.isNetworkError = true;
      }
      
      // Ensure we have at least some error details to log
      // If errorDetails is empty or only has method, include the original error
      if (Object.keys(errorDetails).length <= 1) {
        errorDetails.rawError = String(error);
        errorDetails.rawErrorKeys = error ? Object.keys(error) : [];
      }
      
      // Safe logging with try-catch to prevent logger errors
      try {
        // Ensure errorDetails is properly serializable
        const serializedDetails = JSON.parse(JSON.stringify(errorDetails));
        logger.error(`API call failed for ${methodName}`, serializedDetails);
      } catch (logError) {
        logger.error(`Failed to log error for ${methodName}`, {
          message: error?.message || String(error),
          status: error?.response?.status,
          code: error?.code,
          logError: String(logError)
        });
      }
      
      // Log additional details for 500 errors
      if (error.response?.status === 500) {
        logger.error('Server error details', {
          method: methodName,
          url: error.config?.url,
          requestData: error.config?.data,
          headers: error.config?.headers,
          responseData: error.response?.data // Add backend error message
        });
      }
      
      // Handle network errors (no response from server)
      if (error.request && !error.response) {
        logger.error('Network error - no response from server', {
          method: methodName,
          baseURL: error.config?.baseURL,
          url: error.config?.url,
          code: error.code
        });
        return fallback;
      }
      
      // Handle 401 authentication errors specifically
      if (error.response?.status === 401) {
        logger.warn('Authentication failed, returning fallback', { method: methodName });
        return fallback;
      }
      
      // Handle 403 forbidden (user doesn't have voice agent features)
      if (error.response?.status === 403) {
        logger.warn('Access forbidden, user may not have voice agent features', { method: methodName });
        return fallback;
      }
      
      // Handle 404 not found (endpoint doesn't exist)
      if (error.response?.status === 404) {
        logger.warn('Endpoint not found, returning fallback', { 
          method: methodName,
          url: `${error.config?.baseURL || ''}${error.config?.url || ''}`
        });
        return fallback;
      }
      
      // For other errors, log and return fallback instead of throwing
      const finalErrorLog = {
        message: error?.message || String(error),
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        backendError: error?.response?.data?.error,
        backendDetails: error?.response?.data?.details,
        backendMessage: error?.response?.data?.message,
        code: error?.code,
        url: error?.config?.url,
        baseURL: error?.config?.baseURL,
        method: methodName
      } as any;
      
      // Only add fullBackendResponse if it's serializable
      if (error?.response?.data) {
        try {
          finalErrorLog.fullBackendResponse = JSON.parse(JSON.stringify(error.response.data));
        } catch {
          finalErrorLog.fullBackendResponse = String(error.response.data);
        }
      }
      
      logger.error(`Unexpected error in ${methodName}, returning fallback`, finalErrorLog);
      return fallback;
    }
  }

  /**
   * Get all voice agents for the current tenant
   */
  async getVoiceAgents(): Promise<VoiceAgent[]> {
    return this.safeApiCall(
      async () => {
        const response = await api.get('/api/voice-agent/all');
        return response.data?.data ?? response.data;
      },
      [], // fallback empty array
      'getVoiceAgents'
    );
  }

  /**
   * Get batch call logs for a specific batch
   */
  async getBatchCallLogs(batchId: string): Promise<BatchCallLogEntry[]> {
    return this.safeApiCall(
      async () => {
        const response = await api.get(`/api/voice-agent/batch/status/${batchId}`);
        const data = response.data?.results ?? response.data?.data ?? response.data;
        return data as BatchCallLogEntry[];
      },
      [], // fallback empty array
      'getBatchCallLogs'
    );
  }

  /**
   * Make a call with a voice agent (V2 API)
   */
  async makeCall(voiceAgentId: string, phoneNumber: string, context?: string, fromNumber?: string): Promise<CallLog> {
    return this.safeApiCall(
      async () => {
        // Ensure phone number is in E.164 format for V2 API
        let formattedPhone = phoneNumber;
        if (!phoneNumber.startsWith('+')) {
          // Default to US (+1) if no country code provided
          formattedPhone = phoneNumber.startsWith('1') ? `+${phoneNumber}` : `+1${phoneNumber}`;
        }
        
        // Get user ID for initiated_by field (V2 requires valid UUID)
        let userId = null;
        try {
          // Try different possible keys for user data
          const possibleKeys = ['auth_user', 'user', 'currentUser', 'authUser'];
          let userData = null;
          
          for (const key of possibleKeys) {
            userData = localStorage.getItem(key) || sessionStorage.getItem(key);
            if (userData) break;
          }
          
          if (userData) {
            const user = JSON.parse(userData);
            userId = user.id || user.userId || user.uuid;
            logger.debug('Found user ID for initiated_by', { hasUserId: !!userId });
          }
          
          // If still no userId, try to get it from JWT token
          if (!userId) {
            const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
            if (token) {
              try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                userId = payload.userId || payload.id || payload.sub;
                logger.debug('Extracted user ID from token', { hasUserId: !!userId });
              } catch (e) {
                logger.warn('Failed to decode JWT token for user ID');
              }
            }
          }
        } catch (e) {
          logger.warn('Could not get user ID for initiated_by field');
        }
        
        // Fallback: generate a temporary UUID if we can't find real user ID
        if (!userId) {
          userId = '00000000-0000-4000-8000-000000000000'; // Fallback UUID
          logger.warn('Using fallback UUID for initiated_by field');
        }
        
        // V2 single call format payload
        const payload = {
          voice_id: 'default',
          from_number: fromNumber || '+918634515070',
          to_number: formattedPhone,
          agent_id: parseInt(voiceAgentId, 10),
          initiated_by: userId,
          lead_name: null,
          added_context: context || null
        };
        
        logger.debug('Making single call via LAD backend proxy', { 
          payload: { ...payload, initiated_by: userId ? 'UUID_PROVIDED' : 'NULL' } 
        });
        
        try {
          const response = await api.post('/api/voice-agent/calls/start-call', payload);
          
          logger.debug('Voice call response received', { 
            status: response.status, 
            hasData: !!response.data 
          });
          
          return response.data?.data ?? response.data;
        } catch (apiError: any) {
          // Log detailed error info for debugging
          const errorInfo = {
            status: apiError?.response?.status,
            statusText: apiError?.response?.statusText,
            message: apiError?.message,
            backendError: apiError?.response?.data?.error,
            backendDetails: apiError?.response?.data?.details,
            backendMessage: apiError?.response?.data?.message,
            fullResponseData: apiError?.response?.data,
            payload: payload
          };
          
          logger.error('Voice call API error', errorInfo);
          throw apiError; // Re-throw to be caught by safeApiCall
        }
      },
      { id: 'disabled', status: 'disabled', message: 'VAPI feature is temporarily disabled' } as any,
      'makeCall'
    );
  }

  /**
   * Get call logs for current tenant
   */
  async getCallLogs(voiceAgentId?: string): Promise<CallLog[]> {
    return this.safeApiCall(
      async () => {
        const url = voiceAgentId
          ? `/api/voice-agent/calllogs?voice_agent_id=${voiceAgentId}`
          : '/api/voice-agent/calllogs';
        const response = await api.get(url);
        return response.data?.data ?? response.data;
      },
      [], // fallback empty array
      'getCallLogs'
    );
  }

  /**
   * Get a specific call log
   */
  async getCallLog(id: string): Promise<CallLog> {
    return this.safeApiCall(
      async () => {
        const response = await api.get(`/api/voice-agent/calllogs/${id}`);
        return response.data?.data ?? response.data;
      },
      { id, status: 'disabled', message: 'VAPI feature is temporarily disabled' } as any,
      'getCallLog'
    );
  }

  /**
   * Get all phone numbers for the current tenant
   * Uses JWT-authenticated tenant context; no tenant_id query needed.
   */
  async getTenantPhoneNumbers(): Promise<PhoneNumber[]> {
    return this.safeApiCall(
      async () => {
        const response = await api.get('/api/voice-agent/numbers');
        return response.data?.data ?? response.data;
      },
      [], // fallback empty array
      'getTenantPhoneNumbers'
    );
  }

  /**
   * Get available phone numbers for the authenticated user
   */
  async getUserAvailableNumbers(): Promise<PhoneNumber[]> {
    return this.safeApiCall(
      async () => {
        const response = await api.get('/api/voice-agent/user/available-numbers');
        return response.data?.data ?? response.data;
      },
      [], // fallback empty array
      'getUserAvailableNumbers'
    );
  }

  /**
   * Get available voice agents for the authenticated user
   */
  async getAvailableAgents(): Promise<VoiceAgent[]> {
    return this.safeApiCall(
      async () => {
        const response = await api.get('/api/voice-agent/user/available-agents');
        return response.data?.data ?? response.data;
      },
      [], // fallback empty array
      'getAvailableAgents'
    );
  }

  /**
   * Resolve phone numbers from a list of IDs (Apollo or CRM IDs)
   * @param ids - Array of IDs to resolve
   * @param type - Type of data: 'company' or 'employee'
   */
  async resolvePhones(ids: string[], type: 'company' | 'employee' = 'company'): Promise<any[]> {
    return this.safeApiCall(
      async () => {
        const response = await api.post('/api/voice-agent/resolve-phones', {
          ids,
          type
        });
        return response.data?.data ?? response.data;
      },
      [], // fallback empty array
      'resolvePhones'
    );
  }

  /**
   * Trigger a batch call
   * @param payload - Batch call payload with entries, agent_id, from_number, etc.
   */
  async triggerBatchCall(payload: {
    voice_id: string;
    agent_id: string;
    from_number: string;
    added_context?: string;
    entries: Array<{
      to_number: string;
      lead_name?: string;
      added_context?: string;
      lead_id?: string;
      knowledge_base_store_ids?: string[];
    }>;
    initiated_by?: string;
  }): Promise<{ success: boolean; result: { job_id: string } }> {
    return this.safeApiCall(
      async () => {
        const response = await api.post('/api/voice-agent/batch/trigger-batch-call', payload);
        return response.data;
      },
      { success: false, result: { job_id: '' } }, // fallback
      'triggerBatchCall'
    );
  }

  /**
   * Update summary for a company or employee
   * @param payload - Update summary payload
   */
  async updateSummary(payload: {
    company_data_id?: string;
    employee_data_id?: string;
    name?: string;
    summary: string;
    sales_summary?: string;
    company_sales_summary?: string;
    type: 'company' | 'employee';
  }): Promise<{ success: boolean }> {
    return this.safeApiCall(
      async () => {
        const response = await api.post('/api/voice-agent/update-summary', payload);
        return response.data;
      },
      { success: false }, // fallback
      'updateSummary'
    );
  }

  /**
   * Generate a phrase using Gemini AI
   * @param context - The context to generate a phrase from
   */
  async generatePhrase(context: string): Promise<{ success: boolean; generatedText?: string; error?: string }> {
    return this.safeApiCall(
      async () => {
        const response = await api.post('/api/gemini/generate-phrase', { context });
        return response.data;
      },
      { success: false, error: 'Failed to generate phrase' }, // fallback
      'generatePhrase'
    );
  }
}

export default new VoiceAgentService();
