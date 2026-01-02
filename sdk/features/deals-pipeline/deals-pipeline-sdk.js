/**
 * Deals Pipeline Frontend SDK
 * TypeScript/JavaScript client for consuming backend APIs
 */

class DealsPipelineSDK {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'http://localhost:3004/api/deals-pipeline';
    this.authURL = config.authURL || 'http://localhost:3004/api/auth';
    this.timeout = config.timeout || 30000;
    this.token = config.token || null;
    
    // Try to load token from localStorage if available
    if (typeof window !== 'undefined' && window.localStorage) {
      this.token = localStorage.getItem('deals_pipeline_token') || this.token;
    }
  }
  
  /**
   * Store authentication token
   */
  setToken(token) {
    this.token = token;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('deals_pipeline_token', token);
    }
  }
  
  /**
   * Clear authentication token
   */
  clearToken() {
    this.token = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('deals_pipeline_token');
    }
  }
  
  /**
   * Development login - Get mock JWT token
   */
  async devLogin() {
    const response = await fetch(`${this.authURL}/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`Login failed: ${response.status}`);
    }
    
    const data = await response.json();
    this.setToken(data.token);
    return data;
  }
  
  /**
   * Make HTTP request with error handling
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };
    
    // Add authentication token if available
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    const config = {
      method: options.method || 'GET',
      headers,
      ...options
    };
    
    if (options.body) {
      config.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`API Error [${config.method} ${endpoint}]:`, error);
      throw error;
    }
  }
  
  // === LEADS API ===
  
  async getLeads(filters = {}) {
    const params = new URLSearchParams(filters);
    return this.request(`/leads?${params}`);
  }
  
  async getLead(id) {
    return this.request(`/leads/${id}`);
  }
  
  async createLead(data) {
    return this.request('/leads', {
      method: 'POST',
      body: data
    });
  }
  
  async updateLead(id, data) {
    return this.request(`/leads/${id}`, {
      method: 'PUT',
      body: data
    });
  }
  
  async deleteLead(id) {
    return this.request(`/leads/${id}`, {
      method: 'DELETE'
    });
  }
  
  async updateLeadStage(id, stageKey) {
    // Deployed backend: PUT /pipeline/leads/:id/stage
    return this.request(`/pipeline/leads/${id}/stage`, {
      method: 'PUT',
      body: { stageKey, stage: stageKey }
    });
  }
  
  // === STAGES API ===
  
  async getStages() {
    return this.request('/stages');
  }
  
  async getStage(id) {
    return this.request(`/stages/${id}`);
  }
  
  async createStage(data) {
    return this.request('/stages', {
      method: 'POST',
      body: data
    });
  }
  
  async updateStage(id, data) {
    return this.request(`/stages/${id}`, {
      method: 'PUT',
      body: data
    });
  }
  
  async deleteStage(id) {
    return this.request(`/stages/${id}`, {
      method: 'DELETE'
    });
  }
  
  async reorderStages(stageIdsOrOrders) {
    // Deployed backend: PUT /stages/reorder
    // Accept legacy input (array of stage IDs) and convert to ordered payload.
    const stageOrders = Array.isArray(stageIdsOrOrders)
      ? stageIdsOrOrders.map((key, index) => ({ key, order: index }))
      : stageIdsOrOrders;

    return this.request('/stages/reorder', {
      method: 'PUT',
      body: { stageOrders }
    });
  }
  
  // === PIPELINE API ===
  
  async getPipelineBoard() {
    return this.request('/pipeline/board');
  }
  
  async getPipelineMetrics() {
    return this.request('/pipeline/metrics');
  }
  
  async moveLeadInPipeline(leadId, targetStageId, position) {
    return this.request('/pipeline/move', {
      method: 'POST',
      body: { leadId, targetStageId, position }
    });
  }
  
  // === REFERENCE DATA API ===
  
  async getStatuses() {
    return this.request('/reference/statuses');
  }
  
  async getSources() {
    return this.request('/reference/sources');
  }
  
  async getPriorities() {
    return this.request('/reference/priorities');
  }
  
  // === ATTACHMENTS API ===
  
  async getAttachments(leadId) {
    // Deployed backend: GET /leads/:id/attachments
    return this.request(`/leads/${leadId}/attachments`);
  }
  
  async uploadAttachment(leadId, file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    
    // Deployed backend: POST /leads/:id/attachments
    const response = await fetch(`${this.baseURL}/leads/${leadId}/attachments`, {
      method: 'POST',
      headers,
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    
    return response.json();
  }
  
  async deleteAttachment(leadId, attachmentId) {
    // Deployed backend: DELETE /leads/:id/attachments/:attachmentId
    // Backward-compatible call style: deleteAttachment(attachmentId)
    if (attachmentId === undefined) {
      return this.request(`/attachments/${leadId}`, {
        method: 'DELETE'
      });
    }

    return this.request(`/leads/${leadId}/attachments/${attachmentId}`, {
      method: 'DELETE'
    });
  }
}

// Export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DealsPipelineSDK;
}
