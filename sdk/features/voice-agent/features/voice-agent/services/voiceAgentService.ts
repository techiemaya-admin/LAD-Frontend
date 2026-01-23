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
   * Check if VAPI is disabled
   */
  private isVAPIDisabled(): boolean {
    // Check if force disabled in localStorage (emergency override)
    if (typeof window !== 'undefined' && localStorage.getItem('disable_vapi') === 'true') {
      logger.warn('VAPI disabled via localStorage override');
      return true;
    }
    // Always allow VAPI in development mode for testing
    if (process.env.NODE_ENV === 'development') {
      logger.debug('VAPI enabled for development mode');
      return false;
    }
    // Note: Removed NEXT_PUBLIC_DISABLE_VAPI check to allow VAPI in production
    // VAPI is now enabled by default for authenticated users
    // Check if user has voice agent features enabled based on email
    if (typeof window !== 'undefined') {
      // Try multiple sources for user email
      let userEmail = localStorage.getItem('user_email') || 
                      localStorage.getItem('email') ||
                      sessionStorage.getItem('user_email') ||
                      sessionStorage.getItem('email') || '';
      // Also try to get email from auth object
      if (!userEmail) {
        try {
          const authStr = localStorage.getItem('auth');
          if (authStr) {
            const auth = JSON.parse(authStr);
            userEmail = auth?.user?.email || auth?.email || '';
            if (userEmail) {
              logger.info('VAPI: Found email from auth object', { userEmail: userEmail?.split('@')[0] + '@...' });
            }
          }
        } catch (e) {
          logger.debug('VAPI: Failed to parse auth object', { error: e?.message });
        }
      }
      logger.info('VAPI: Checking user email for access', { hasEmail: !!userEmail, userEmail: userEmail?.split('@')[0] + '@...' });
      // Allow specific domains that have voice agent features
      const allowedDomains = [
        'sasyaspaces.com',
        'techiemaya.com', 
        'plutotravels.ae'
      ];
      const domain = userEmail.split('@')[1]?.toLowerCase();
      logger.info('VAPI: User domain check', { domain: domain || 'NO_DOMAIN', allowed: allowedDomains });
      if (domain && allowedDomains.includes(domain)) {
        logger.info('✅ VAPI ENABLED for authorized domain', { domain });
        return false;
      } else if (userEmail) {
        // Email found but domain not in allowed list - still allow VAPI for authenticated users
        logger.info('⚠️ VAPI: Domain not in whitelist but user authenticated - enabling anyway', { domain, email: userEmail?.split('@')[0] + '@...' });
        return false;
      }
    }
    // Default: ALLOW VAPI for anyone (fallback to enabled state)
    // This ensures that if we can't determine auth status, we still try to fetch data
    logger.info('VAPI: Using default enabled state (no auth info found but proceeding)');
    return false;
  }
  /**
   * Safe API call wrapper that handles errors and disabled state
   */
  private async safeApiCall<T>(apiCall: () => Promise<T>, fallback: T, methodName: string): Promise<T> {
    if (this.isVAPIDisabled()) {
      logger.warn('VAPI disabled, skipping API call', { method: methodName });
      return fallback;
    }
    try {
      return await apiCall();
    } catch (error: any) {
      // Enhanced error logging with response details
      // Build a clean error object to avoid circular references
      const errorDetails: any = {
        method: methodName,
        message: error?.message || String(error) || 'Unknown error',
        errorType: error?.constructor?.name || typeof error,
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
      // Safe logging with try-catch to prevent logger errors
      try {
        logger.error(`API call failed for ${methodName}`, errorDetails);
      } catch (logError) {
        console.error(`Failed to log error for ${methodName}:`, error?.message || error);
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
      logger.error(`Unexpected error in ${methodName}, returning fallback`, {
        message: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n')
      });
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
        const response = await api.post('/api/voice-agent/calls/start-call', payload);
        logger.debug('Voice call response received', { 
          status: response.status, 
          hasData: !!response.data 
        });
        return response.data?.data ?? response.data;
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
        // V2 API doesn't have resolve-phones endpoint
        // This feature may need to be implemented differently in V2
        logger.warn('resolvePhones not available in V2 API', { ids, type });
        return [];
      },
      [], // fallback empty array
      'resolvePhones'
    );
  }
}
export default new VoiceAgentService();