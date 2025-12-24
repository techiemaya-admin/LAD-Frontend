/**
 * Apollo Leads Service - Frontend
 * 
 * PURPOSE:
 * Provides a clean TypeScript service layer for Apollo.io integration on the frontend.
 * Handles all API communication with the backend Apollo feature endpoints.
 * 
 * ARCHITECTURE:
 * - Single service instance (singleton pattern)
 * - Type-safe API calls with full TypeScript support
 * - Automatic token management and authentication
 * - Comprehensive error handling
 * - Credit tracking and insufficient credit handling
 * 
 * ENDPOINTS:
 * - POST /api/apollo-leads/search - Search for companies
 * - POST /api/apollo-leads/employees - Search for employees
 * - GET /api/apollo-leads/leads/:id/email - Reveal email (costs credits)
 * - GET /api/apollo-leads/leads/:id/phone - Reveal phone (costs credits)
 * - GET /api/apollo-leads/health - Health check
 * 
 * CREDIT COSTS:
 * - Company search: 1 credit
 * - Email reveal: 1 credit
 * - Phone reveal: 8 credits
 * 
 * ERROR HANDLING:
 * - 401: Authentication required
 * - 402: Insufficient credits
 * - 403: Feature not available (upgrade required)
 * - 404: Resource not found
 * - 500: Server error
 */

import type {
  ApolloSearchParams,
  ApolloSearchResponse,
  ApolloEmployeeSearchParams,
  ApolloEmployeeSearchResponse,
  ApolloCompany,
  ApolloHealthResponse,
  ApolloApiResponse,
  ApolloLeadsServiceInterface
} from '../types/apollo.types';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';

class ApolloLeadsService implements ApolloLeadsServiceInterface {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE_URL}/api/apollo-leads`;
  }

  /**
   * Get authentication headers with JWT token
   */
  private getAuthHeaders(): HeadersInit {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }

  /**
   * Get token from localStorage (safe for SSR)
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token') || localStorage.getItem('auth_token');
  }

  /**
   * Handle API response and extract data
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData: ApolloApiResponse = await response.json().catch(() => ({
        success: false,
        error: 'Unknown error'
      }));

      // Handle specific error cases
      switch (response.status) {
        case 401:
          throw new Error('Authentication required. Please log in.');
        case 402:
          throw new Error(errorData.message || 'Insufficient credits to perform this operation.');
        case 403:
          throw new Error(errorData.message || 'Feature not available. Upgrade required.');
        case 404:
          throw new Error(errorData.message || 'Resource not found.');
        default:
          throw new Error(errorData.message || `API error: ${response.status}`);
      }
    }

    const data: ApolloApiResponse<T> = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || data.error || 'Operation failed');
    }

    return data.data as T;
  }

  /**
   * Search for companies using Apollo.io
   */
  async searchCompanies(params: ApolloSearchParams): Promise<ApolloSearchResponse> {
    try {
      console.log('🔍 Apollo company search:', params);

      const response = await fetch(`${this.baseUrl}/search`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          query: params.query || params.keywords?.join(' '),
          location: params.location,
          industry: params.industry,
          employee_count_min: params.employee_count_min,
          employee_count_max: params.employee_count_max,
          revenue_min: params.revenue_min,
          revenue_max: params.revenue_max,
          technologies: params.technologies,
          limit: params.limit || 50,
          offset: params.offset || 0
        })
      });

      const data = await this.handleResponse<ApolloSearchResponse>(response);
      console.log('✅ Apollo search results:', data);
      return data;
    } catch (error) {
      console.error('❌ Apollo search failed:', error);
      throw error;
    }
  }

  /**
   * Get detailed company information
   */
  async getCompanyDetails(companyId: string): Promise<ApolloCompany> {
    try {
      const response = await fetch(`${this.baseUrl}/companies/${companyId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      return await this.handleResponse<ApolloCompany>(response);
    } catch (error) {
      console.error('❌ Get company details failed:', error);
      throw error;
    }
  }

  /**
   * Search for employees at a company
   */
  async searchEmployees(params: ApolloEmployeeSearchParams): Promise<ApolloEmployeeSearchResponse> {
    try {
      console.log('👥 Apollo employee search:', params);

      const response = await fetch(`${this.baseUrl}/employees/search`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          company_id: params.company_id,
          company_name: params.company_name,
          titles: params.titles,
          seniority: params.seniority,
          departments: params.departments,
          location: params.location,
          limit: params.limit || 50
        })
      });

      const data = await this.handleResponse<ApolloEmployeeSearchResponse>(response);
      console.log('✅ Apollo employee results:', data);
      return data;
    } catch (error) {
      console.error('❌ Apollo employee search failed:', error);
      throw error;
    }
  }

  /**
   * Reveal email for a person (costs 1 credit)
   */
  async revealEmail(personId: string): Promise<string> {
    try {
      console.log('📧 Revealing email for person:', personId);

      const response = await fetch(`${this.baseUrl}/leads/${personId}/email`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await this.handleResponse<{ email: string }>(response);
      console.log('✅ Email revealed');
      return data.email;
    } catch (error) {
      console.error('❌ Email reveal failed:', error);
      throw error;
    }
  }

  /**
   * Reveal phone for a person (costs 8 credits)
   */
  async revealPhone(personId: string): Promise<string> {
    try {
      console.log('📞 Revealing phone for person:', personId);

      const response = await fetch(`${this.baseUrl}/leads/${personId}/phone`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      const data = await this.handleResponse<{ phone: string }>(response);
      console.log('✅ Phone revealed');
      return data.phone;
    } catch (error) {
      console.error('❌ Phone reveal failed:', error);
      throw error;
    }
  }

  /**
   * Health check for Apollo service
   */
  async checkHealth(): Promise<ApolloHealthResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      return await this.handleResponse<ApolloHealthResponse>(response);
    } catch (error) {
      console.error('❌ Apollo health check failed:', error);
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use searchCompanies instead
   */
  async searchLeads(params: any): Promise<ApolloSearchResponse> {
    console.warn('⚠️ searchLeads() is deprecated. Use searchCompanies() instead.');
    return this.searchCompanies({
      query: params.query || params.keyword,
      location: params.location,
      limit: params.max_results || 50
    });
  }
}

// Export singleton instance
export const apolloLeadsService = new ApolloLeadsService();

// Export class for testing
export { ApolloLeadsService };
