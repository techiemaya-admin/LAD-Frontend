/**
 * Apollo.io Leads Service
 * Replaces SerpAPI with Apollo.io for comprehensive company data
 */

import { safeStorage } from '@/utils/storage';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';

class ApolloLeadsService {
  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/apollo-leads`;
  }

  /**
   * Get auth headers with token
   */
  getAuthHeaders() {
    const token = safeStorage.getItem('token') || safeStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Search for companies using Apollo.io
   */
  async searchLeads(params) {
    try {
      console.log('🔍 Apollo.io search params:', params);
      
      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          query: params.query || params.keyword,
          location: params.location,
          max_results: params.max_results || 100,  // Default: 100 companies
          page: params.page || 1  // Page number (default: 1)
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle insufficient credits error
        if (response.status === 402) {
          throw new Error(errorData.message || `Insufficient credits. You need ${errorData.required_credits || 1} credits to perform this search.`);
        }
        
        throw new Error(errorData.message || `Apollo.io API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Apollo.io search results:', data);
      
      // Return both companies and metadata (page info, from_cache, etc.)
      return {
        companies: data.companies || [],
        page: data.page || 1,
        fromCache: data.from_cache || false,
        totalFound: data.total_found || 0
      };
    } catch (error) {
      console.error('❌ Apollo.io search failed:', error);
      throw error;
    }
  }

  /**
   * Get company details by ID
   */
  async getCompanyDetails(companyId) {
    try {
      const response = await fetch(`${this.baseUrl}/company/${companyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Apollo.io API error: ${response.status}`);
      }

      const data = await response.json();
      return data.company;
    } catch (error) {
      console.error('❌ Apollo.io company details failed:', error);
      throw error;
    }
  }

  /**
   * Get employees for a company
   */
  async getCompanyEmployees(companyId, limit = 25) {
    try {
      const response = await fetch(`${this.baseUrl}/company/${companyId}/employees`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Apollo.io API error: ${response.status}`);
      }

      const data = await response.json();
      return data.employees || [];
    } catch (error) {
      console.error('❌ Apollo.io employees failed:', error);
      throw error;
    }
  }

  /**
   * Health check for Apollo.io service
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`Apollo.io health check failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('❌ Apollo.io health check failed:', error);
      throw error;
    }
  }
}

export const apolloLeadsService = new ApolloLeadsService();

