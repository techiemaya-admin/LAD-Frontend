/**
 * Dashboard API Service
 * Handles all API calls to dashboard backend
 */

import {
  LeadBooking,
  User,
  LeadBookingListResponse,
  LeadBookingResponse,
  UsersListResponse,
  GetLeadBookingsParams,
  CreateLeadBookingParams,
  UpdateLeadBookingParams
} from '../types';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api/dashboard';

class DashboardApiService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private getHeaders() {
    return {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` })
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error);
      throw error;
    }
  }

  // Lead Bookings APIs
  async getLeadBookings(params?: GetLeadBookingsParams): Promise<LeadBookingListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      if (params.user_id) queryParams.append('user_id', params.user_id);
      if (params.status) queryParams.append('status', params.status);
      if (params.bookingType) queryParams.append('bookingType', params.bookingType);
      if (params.bookingSource) queryParams.append('bookingSource', params.bookingSource);
      if (params.leadId) queryParams.append('leadId', params.leadId);
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.callResult) queryParams.append('callResult', params.callResult);
      if (params.limit) queryParams.append('limit', params.limit.toString());
    }

    const query = queryParams.toString();
    const endpoint = `/bookings${query ? `?${query}` : ''}`;
    
    return this.request<LeadBookingListResponse>(endpoint);
  }

  async getLeadBookingById(bookingId: string): Promise<LeadBookingResponse> {
    return this.request<LeadBookingResponse>(`/bookings/${bookingId}`);
  }

  async createLeadBooking(data: CreateLeadBookingParams): Promise<LeadBookingResponse> {
    return this.request<LeadBookingResponse>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateLeadBooking(
    bookingId: string,
    data: UpdateLeadBookingParams
  ): Promise<LeadBookingResponse> {
    return this.request<LeadBookingResponse>(`/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Users APIs
  async getTenantUsers(): Promise<UsersListResponse> {
    return this.request<UsersListResponse>('/users');
  }
}

export const dashboardApiService = new DashboardApiService();
