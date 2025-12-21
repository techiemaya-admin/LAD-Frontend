/**
 * Apollo Leads Service
 * Comprehensive company and employee search using Apollo.io
 */

import api from './api';

export interface ApolloSearchParams {
  query?: string;
  keyword?: string;
  location?: string;
  max_results?: number;
  page?: number;
  company_size?: string;
  industries?: string[];
  job_titles?: string[];
}

export interface ApolloCompany {
  id: string;
  apollo_organization_id?: string;
  name: string;
  company_name?: string;
  domain?: string;
  website?: string;
  linkedin_url?: string;
  phone?: string;
  company_phone?: string;
  location?: string;
  city?: string;
  country?: string;
  industry?: string;
  employee_count?: number;
  revenue?: string;
  description?: string;
  logo_url?: string;
  summary?: string;
  rawData?: any;
}

export interface ApolloEmployee {
  id: string;
  name: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  company_name?: string;
  company_id?: string;
  photo_url?: string;
  revealed?: boolean;
}

export interface ApolloSearchResponse {
  companies: ApolloCompany[];
  page: number;
  fromCache: boolean;
  totalFound: number;
  creditsUsed?: number;
}

export interface ApolloEmployeeSearchResponse {
  employees: ApolloEmployee[];
  page: number;
  totalFound: number;
  creditsUsed?: number;
}

class ApolloLeadsService {
  private baseUrl: string;

  constructor() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
    this.baseUrl = `${backendUrl}/api/apollo-leads`;
  }

  /**
   * Search for companies using Apollo.io
   */
  async searchLeads(params: ApolloSearchParams): Promise<ApolloSearchResponse> {
    try {
      console.log('🔍 Apollo.io search params:', params);
      
      const response = await api.post(`${this.baseUrl}/search`, {
        query: params.query || params.keyword,
        location: params.location,
        max_results: params.max_results || 100,  // Default: 100 companies
        page: params.page || 1,  // Page number (default: 1)
        company_size: params.company_size,
        industries: params.industries,
        job_titles: params.job_titles
      });

      console.log('✅ Apollo.io search results:', response.data);
      
      // Return both companies and metadata (page info, from_cache, etc.)
      return {
        companies: response.data.companies || [],
        page: response.data.page || 1,
        fromCache: response.data.from_cache || false,
        totalFound: response.data.total_found || 0,
        creditsUsed: response.data.credits_used
      };
    } catch (error: any) {
      console.error('❌ Apollo.io search failed:', error);
      
      // Handle insufficient credits error
      if (error.response?.status === 402) {
        const errorData = error.response.data;
        throw new Error(
          errorData.message || 
          `Insufficient credits. You need ${errorData.required_credits || 1} credits to perform this search.`
        );
      }
      
      throw new Error(error.response?.data?.message || 'Apollo.io search failed');
    }
  }

  /**
   * Search for employees/people
   */
  async searchEmployees(params: {
    person_titles?: string[];
    company_ids?: string[];
    company_keywords?: string;
    location?: string;
    per_page?: number;
    page?: number;
  }): Promise<ApolloEmployeeSearchResponse> {
    try {
      console.log('👥 Apollo.io employee search params:', params);
      
      const response = await api.post(`${this.baseUrl}/search-employees`, {
        person_titles: params.person_titles,
        company_ids: params.company_ids,
        company_keywords: params.company_keywords,
        location: params.location,
        per_page: params.per_page || 25,
        page: params.page || 1
      });

      console.log('✅ Apollo.io employee search results:', response.data);
      
      return {
        employees: response.data.employees || [],
        page: response.data.page || 1,
        totalFound: response.data.total_found || 0,
        creditsUsed: response.data.credits_used
      };
    } catch (error: any) {
      console.error('❌ Apollo.io employee search failed:', error);
      
      if (error.response?.status === 402) {
        const errorData = error.response.data;
        throw new Error(
          errorData.message || 
          `Insufficient credits for employee search.`
        );
      }
      
      throw new Error(error.response?.data?.message || 'Apollo.io employee search failed');
    }
  }

  /**
   * Get company details by ID
   */
  async getCompanyDetails(companyId: string): Promise<ApolloCompany> {
    try {
      const response = await api.get(`${this.baseUrl}/company/${companyId}`);
      return response.data.company;
    } catch (error: any) {
      console.error('❌ Apollo.io company details failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to get company details');
    }
  }

  /**
   * Get employees for a company
   */
  async getCompanyEmployees(companyId: string, limit = 25): Promise<ApolloEmployee[]> {
    try {
      const response = await api.get(`${this.baseUrl}/company/${companyId}/employees`, {
        params: { limit }
      });
      return response.data.employees || [];
    } catch (error: any) {
      console.error('❌ Apollo.io company employees failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to get company employees');
    }
  }

  /**
   * Resolve phone numbers from company search cache
   */
  async resolvePhones(ids: string[], type: 'company' | 'employee'): Promise<any[]> {
    try {
      const response = await api.post(`${this.baseUrl}/resolve-phones`, {
        ids,
        type
      });
      return response.data.data || [];
    } catch (error: any) {
      console.error('❌ Phone resolution failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to resolve phone numbers');
    }
  }

  /**
   * Reveal employee contact information (email/phone)
   */
  async revealContact(employeeId: string, type: 'email' | 'phone'): Promise<any> {
    try {
      const response = await api.post(`${this.baseUrl}/reveal-contact`, {
        employee_id: employeeId,
        contact_type: type
      });
      return response.data;
    } catch (error: any) {
      console.error('❌ Contact reveal failed:', error);
      
      if (error.response?.status === 402) {
        throw new Error('Insufficient credits to reveal contact information');
      }
      
      throw new Error(error.response?.data?.message || 'Failed to reveal contact');
    }
  }

  /**
   * Enrich company data with additional information
   */
  async enrichCompany(companyId: string): Promise<ApolloCompany> {
    try {
      const response = await api.post(`${this.baseUrl}/enrich-company`, {
        company_id: companyId
      });
      return response.data.company;
    } catch (error: any) {
      console.error('❌ Company enrichment failed:', error);
      throw new Error(error.response?.data?.message || 'Failed to enrich company');
    }
  }

  /**
   * Check Apollo.io API health
   */
  async checkHealth(): Promise<{ status: string; available: boolean }> {
    try {
      const response = await api.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Apollo.io health check failed:', error);
      return { status: 'unavailable', available: false };
    }
  }

  /**
   * Get search history
   */
  async getSearchHistory(limit = 10): Promise<any[]> {
    try {
      const response = await api.get(`${this.baseUrl}/search-history`, {
        params: { limit }
      });
      return response.data.history || [];
    } catch (error: any) {
      console.error('❌ Failed to get search history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const apolloLeadsService = new ApolloLeadsService();

// Export class for testing
export default ApolloLeadsService;
