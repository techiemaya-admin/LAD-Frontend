import api from '../../../../web/src/services/api';
import { VoiceAgent, CallLog } from '../types';

/**
 * Voice Agent Service
 */
class VoiceAgentService {
  /**
   * Get all voice agents
   */
  async getVoiceAgents(): Promise<VoiceAgent[]> {
    const response = await api.get('/api/voice-agent');
    return response.data;
  }

  /**
   * Get a specific voice agent
   */
  async getVoiceAgent(id: string): Promise<VoiceAgent> {
    const response = await api.get(`/api/voice-agent/${id}`);
    return response.data;
  }

  /**
   * Create a new voice agent
   */
  async createVoiceAgent(data: Partial<VoiceAgent>): Promise<VoiceAgent> {
    const response = await api.post('/api/voice-agent', data);
    return response.data;
  }

  /**
   * Update a voice agent
   */
  async updateVoiceAgent(id: string, data: Partial<VoiceAgent>): Promise<VoiceAgent> {
    const response = await api.put(`/api/voice-agent/${id}`, data);
    return response.data;
  }

  /**
   * Delete a voice agent
   */
  async deleteVoiceAgent(id: string): Promise<void> {
    await api.delete(`/api/voice-agent/${id}`);
  }

  /**
   * Make a call with a voice agent
   */
  async makeCall(voiceAgentId: string, phoneNumber: string, context?: string): Promise<CallLog> {
    const response = await api.post('/api/voice-agent/make-call', {
      voice_agent_id: voiceAgentId,
      phone_number: phoneNumber,
      added_context: context,
    });
    return response.data;
  }

  /**
   * Get call logs
   */
  async getCallLogs(voiceAgentId?: string): Promise<CallLog[]> {
    const url = voiceAgentId ? `/api/call-logs?voice_agent_id=${voiceAgentId}` : '/api/call-logs';
    const response = await api.get(url);
    return response.data;
  }

  /**
   * Get a specific call log
   */
  async getCallLog(id: string): Promise<CallLog> {
    const response = await api.get(`/api/call-logs/${id}`);
    return response.data;
  }
}

export default new VoiceAgentService();
