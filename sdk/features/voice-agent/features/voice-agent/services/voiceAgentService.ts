import api from './api';
import { VoiceAgent, CallLog, PhoneNumber, BatchCallLogEntry } from '../types';

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
      return true;
    }

    // Check if globally disabled via environment variable
    if (process.env.NEXT_PUBLIC_DISABLE_VAPI === 'true') {
      return true;
    }

    // Check if user has voice agent features enabled based on email
    if (typeof window !== 'undefined') {
      const userEmail = localStorage.getItem('user_email') || 
                       localStorage.getItem('email') ||
                       sessionStorage.getItem('user_email') || '';
      
      // Allow specific domains that have voice agent features
      const allowedDomains = [
        'sasyaspaces.com',
        'techiemaya.com', 
        'plutotravels.ae'
      ];
      
      const domain = userEmail.split('@')[1]?.toLowerCase();
      if (domain && allowedDomains.includes(domain)) {
        // Voice agent features are enabled for this domain
        return false;
      }
    }
    
    // Default: disable VAPI for unknown users/domains in development
    return process.env.NODE_ENV === 'development';
  }

  /**
   * Safe API call wrapper that handles errors and disabled state
   */
  private async safeApiCall<T>(apiCall: () => Promise<T>, fallback: T, methodName: string): Promise<T> {
    if (this.isVAPIDisabled()) {
      console.warn(`[VoiceAgent] VAPI is disabled for this user, skipping ${methodName}`);
      return fallback;
    }

    try {
      return await apiCall();
    } catch (error: any) {
      // Handle 401 authentication errors specifically
      if (error.response?.status === 401) {
        console.warn(`[VoiceAgent] Authentication failed for ${methodName}, user may need to login`);
        return fallback;
      }
      
      // Handle 403 forbidden (user doesn't have voice agent features)
      if (error.response?.status === 403) {
        console.warn(`[VoiceAgent] Access forbidden for ${methodName}, user may not have voice agent features enabled`);
        return fallback;
      }
      
      // Handle other API errors
      console.error(`[VoiceAgent] API call failed for ${methodName}:`, error);
      throw error; // Re-throw non-auth errors so the UI can handle them
    }
  }

  /**
   * Get all voice agents for the current tenant
   */
  async getVoiceAgents(): Promise<VoiceAgent[]> {
    return this.safeApiCall(
      async () => {
        const response = await api.get('/voice-agent/all');
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
        const response = await api.get(`/voice-agent/calllogs/batch/${batchId}`);
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
  async makeCall(voiceAgentId: string, phoneNumber: string, context?: string): Promise<CallLog> {
    return this.safeApiCall(
      async () => {
        const response = await api.post('/voice-agent/calls/start-call', {
          voice_agent_id: voiceAgentId,
          phone_number: phoneNumber,
          added_context: context,
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
          ? `/voice-agent/calllogs?voice_agent_id=${voiceAgentId}`
          : '/voice-agent/calllogs';
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
        const response = await api.get(`/voice-agent/calllogs/${id}`);
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
        const response = await api.get('/voice-agent/numbers');
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
        const response = await api.post('/voiceagent/resolve-phones', {
          ids,
          type,
        });
        return response.data?.data ?? response.data;
      },
      [], // fallback empty array
      'resolvePhones'
    );
  }
}

export default new VoiceAgentService();
