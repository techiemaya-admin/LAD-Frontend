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
  UpdateLeadBookingParams,
  CallLog,
  CallLogListResponse,
  WalletStatsResponse,
  PhoneNumberListResponse,
  VoiceAgentListResponse,
  GetDashboardCallsParams
} from '../types';

// Support both React (REACT_APP_) and Next.js (NEXT_PUBLIC_) environment variable conventions
const getApiBaseUrl = (): string => {
  // Next.js client-side env variables
  if (typeof window !== 'undefined') {
    return (window as any).NEXT_PUBLIC_API_BASE_URL ||
      (window as any).NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_BASE_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.REACT_APP_API_BASE_URL ||
      '/api/dashboard';
  }
  // Server-side fallback
  return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || '/api/dashboard';
};

class DashboardApiService {
  private token: string | null = null;
  private apiBaseUrl: string = getApiBaseUrl();

  setToken(token: string) {
    this.token = token;
  }

  setApiBaseUrl(url: string) {
    this.apiBaseUrl = url;
  }

  private getHeaders() {
    // Try to get token from this.token first, then fall back to browser storage
    let token = this.token;

    if (!token && typeof window !== 'undefined') {
      // Try cookies first (primary storage for tokens)
      const cookies = document.cookie ? document.cookie.split(";") : [];
      for (const cookie of cookies) {
        const [rawName, ...rawValueParts] = cookie.trim().split("=");
        const name = rawName?.trim();
        if (name === "token") {
          token = decodeURIComponent(rawValueParts.join("=") || "");
          break;
        }
      }

      // Fallback to localStorage if cookie not found
      if (!token) {
        try {
          token = localStorage.getItem('token');
        } catch (e) {
          // Silent fail
        }
      }
    }

    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiBaseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.getHeaders(),
          ...options.headers
        }
      });

      // Handle 401/403 auth errors gracefully - return empty response instead of throwing
      if (response.status === 401 || response.status === 403) {
        console.warn(`Auth error [${response.status}] on ${endpoint} - returning empty data`);
        return { success: false, data: [], error: 'Authentication required' } as any;
      }

      // if (!response.ok) {
      //   const error = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
      //   throw new Error(error.message || `HTTP ${response.status}`);
      // }

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
    const endpoint = `/api/dashboard/bookings${query ? `?${query}` : ''}`;

    return this.request<LeadBookingListResponse>(endpoint);
  }

  async getLeadBookingById(bookingId: string): Promise<LeadBookingResponse> {
    return this.request<LeadBookingResponse>(`/api/dashboard/bookings/${bookingId}`);
  }

  async createLeadBooking(data: CreateLeadBookingParams): Promise<LeadBookingResponse> {
    return this.request<LeadBookingResponse>('/api/dashboard/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async updateLeadBooking(
    bookingId: string,
    data: UpdateLeadBookingParams
  ): Promise<LeadBookingResponse> {
    return this.request<LeadBookingResponse>(`/api/dashboard/bookings/${bookingId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  // Users APIs
  async getTenantUsers(): Promise<UsersListResponse> {
    return this.request<UsersListResponse>('/api/dashboard/users');
  }

  // Dashboard Calls API
  async getDashboardCalls(params?: GetDashboardCallsParams): Promise<CallLogListResponse> {
    const queryParams = new URLSearchParams();
    if (params) {
      if (params.startDate) queryParams.append('startDate', params.startDate);
      if (params.endDate) queryParams.append('endDate', params.endDate);
      if (params.user_id) queryParams.append('user_id', params.user_id);
    }
    const query = queryParams.toString();
    const endpoint = `/api/dashboard/calls${query ? `?${query}` : ''}`;

    // The DashboardGrid.tsx had complex mapping logic. We should ideally move that here
    // But for now, let's keep it close to the original implementation which expects raw logs
    const res = await this.request<any>(endpoint);

    // Replicating DashboardGrid.tsx mapping logic
    const rows: any[] = Array.isArray(res) ? res : (res.data || res.logs || res.calls || []);
    const mapped: CallLog[] = rows.map((r: any) => {
      const leadFullName = [r.lead_first_name, r.lead_last_name]
        .filter(Boolean)
        .join(' ')
        .trim();

      return {
        id: String(r.id ?? r.call_id ?? r.call_log_id ?? r.uuid ?? (typeof crypto !== 'undefined' ? crypto.randomUUID() : Math.random().toString(36).substring(7))),
        from: r.agent || r.initiated_by || r.from || r.from_number || r.fromnum || r.source || r.from_number_id || '-',
        to: r.to || r.to_number || r.tonum || '-',
        startedAt: r.startedAt || r.started_at || r.created_at || r.createdAt || r.start_time || r.timestamp || '',
        endedAt: r.endedAt ?? r.ended_at ?? r.end_time ?? undefined,
        status: r.status || r.call_status || r.result || 'unknown',
        recordingUrl: r.recordingUrl ?? r.call_recording_url ?? r.recording_url ?? undefined,
        timeline: r.timeline,
        agentName: r.agent_name ?? r.agent ?? r.voice ?? undefined,
        leadName: leadFullName || (r.lead_name ?? r.target ?? r.client_name ?? r.customer_name ?? undefined),
        duration_seconds: r.duration_seconds ?? r.call_duration ?? r.duration ?? undefined,
      };
    });

    return { success: true, data: mapped };
  }

  // Wallet/Credits API
  async getWalletStats(): Promise<WalletStatsResponse> {
    const walletData = await this.request<any>('/api/billing/wallet');

    // Replicating DashboardGrid.tsx logic
    const balance = walletData?.wallet?.availableBalance ||
      walletData?.wallet?.currentBalance ||
      walletData?.credits ||
      walletData?.balance ||
      0;

    const usageThisMonth = walletData?.monthly_usage || 0;
    const totalMinutes = balance * 3.7;
    const remainingMinutes = totalMinutes * (1 - usageThisMonth / 100);

    return {
      success: true,
      data: {
        balance,
        totalMinutes,
        remainingMinutes,
        usageThisMonth,
      }
    };
  }

  // Available Numbers API
  async getAvailableNumbers(): Promise<PhoneNumberListResponse> {
    const data = await this.request<any>('/api/dashboard/available-numbers');
    const numbers = data?.numbers || data?.items || [];
    return { success: true, data: numbers };
  }

  // Available Agents API
  async getAvailableAgents(): Promise<VoiceAgentListResponse> {
    const data = await this.request<any>('/api/dashboard/user/available-agents');
    const agents = data?.agents || data?.items || [];
    return { success: true, data: agents };
  }
}

export const dashboardApiService = new DashboardApiService();
