/**
 * Deals Pipeline Frontend SDK
 * TypeScript/JavaScript client for consuming backend APIs
 */
class DealsPipelineSDK {
  constructor(config = {}) {
    this.baseURL = config.baseURL || 'https://lad-backend-develop-741719885039.us-central1.run.app/api/deals-pipeline';
    this.authURL = config.authURL || 'https://lad-backend-develop-741719885039.us-central1.run.app/api/auth';
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
      // Handle 204 No Content - no body to parse
      if (response.status === 204) {
        return null;
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
  async updateLeadStage(id, stageId) {
    return this.request(`/leads/${id}/stage`, {
      method: 'PATCH',
      body: { stageId }
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
  async reorderStages(stageIds) {
    return this.request('/stages/reorder', {
      method: 'POST',
      body: { stageIds }
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
    return this.request(`/leads/${leadId}/attachments`);
  }
  async uploadAttachment(leadId, file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);
    const headers = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText));
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });
      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });
      xhr.open('POST', `${this.baseURL}/leads/${leadId}/attachments`);
      Object.keys(headers).forEach(key => {
        xhr.setRequestHeader(key, headers[key]);
      });
      xhr.send(formData);
    });
  }
  async deleteAttachment(leadId, attachmentId) {
    return this.request(`/leads/${leadId}/attachments/${attachmentId}`, {
      method: 'DELETE'
    });
  }
  // === NOTES API ===
  async getNotes(leadId) {
    return this.request(`/leads/${leadId}/notes`);
  }
  async createNote(leadId, content) {
    return this.request(`/leads/${leadId}/notes`, {
      method: 'POST',
      body: { content }
    });
  }
  async deleteNote(leadId, noteId) {
    return this.request(`/leads/${leadId}/notes/${noteId}`, {
      method: 'DELETE'
    });
  }
}
// Export for Node.js/module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DealsPipelineSDK;
}