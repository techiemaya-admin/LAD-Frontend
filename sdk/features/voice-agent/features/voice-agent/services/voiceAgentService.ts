import api from '../../../../web/src/services/api';
import { VoiceAgent, CallLog, PhoneNumber, BatchCallLogEntry } from '../types';

/**
 * Voice Agent Service
 */
class VoiceAgentService {
  /**
   * Get all voice agents for the current tenant
   */
  async getVoiceAgents(): Promise<VoiceAgent[]> {
    const response = await api.get('/api/voiceagent/all');
    return response.data?.data ?? response.data;
  }

  /**
   * Get batch call logs for a specific batch
   */
  async getBatchCallLogs(batchId: string): Promise<BatchCallLogEntry[]> {
    const response = await api.get(`/api/voiceagent/calllogs/batch/${batchId}`);
    const data = response.data?.results ?? response.data?.data ?? response.data;
    return data as BatchCallLogEntry[];
  }

  /**
   * Make a call with a voice agent
   */
  async makeCall(voiceAgentId: string, phoneNumber: string, context?: string): Promise<CallLog> {
    const response = await api.post('/api/voiceagent/calls', {
      voice_agent_id: voiceAgentId,
      phone_number: phoneNumber,
      added_context: context,
    });
    return response.data?.data ?? response.data;
  }

  /**
   * Get call logs for current tenant
   */
  async getCallLogs(voiceAgentId?: string): Promise<CallLog[]> {
    const url = voiceAgentId
      ? `/api/voiceagent/calllogs?voice_agent_id=${voiceAgentId}`
      : '/api/voiceagent/calllogs';
    const response = await api.get(url);
    return response.data?.data ?? response.data;
  }

  /**
   * Get a specific call log
   */
  async getCallLog(id: string): Promise<CallLog> {
    const response = await api.get(`/api/voiceagent/calllogs/${id}`);
    return response.data?.data ?? response.data;
  }

  /**
   * Get all phone numbers for the current tenant
   * Uses JWT-authenticated tenant context; no tenant_id query needed.
   */
  async getTenantPhoneNumbers(): Promise<PhoneNumber[]> {
    const response = await api.get('/api/voiceagent/numbers');
    return response.data?.data ?? response.data;
  }

  /**
   * Get available phone numbers for the authenticated user
   */
  async getUserAvailableNumbers(): Promise<PhoneNumber[]> {
    const response = await api.get('/api/voiceagent/user/available-numbers');
    return response.data?.data ?? response.data;
  }
}

export default new VoiceAgentService();
