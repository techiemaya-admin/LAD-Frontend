// Dashboard/Overview SDK API Layer
import { apiGet, apiPost, apiPut } from "../../shared/apiClient";
import type {
  LeadBookingListResponse,
  LeadBookingResponse,
  UsersListResponse,
  GetLeadBookingsParams,
  CreateLeadBookingParams,
  UpdateLeadBookingParams,
  CallLog,
  CallSummary,
  CallLogListResponse,
  WalletStatsResponse,
  PhoneNumberListResponse,
  VoiceAgentListResponse,
  GetDashboardCallsParams,
} from "./types";

/**
 * Get lead bookings with optional filters
 */
export async function getLeadBookings(
  params?: GetLeadBookingsParams
): Promise<LeadBookingListResponse> {
  const query = new URLSearchParams();

  if (params?.user_id) query.append("user_id", params.user_id);
  if (params?.status) query.append("status", params.status);
  if (params?.bookingType) query.append("bookingType", params.bookingType);
  if (params?.bookingSource) query.append("bookingSource", params.bookingSource);
  if (params?.leadId) query.append("leadId", params.leadId);
  if (params?.startDate) query.append("startDate", params.startDate);
  if (params?.endDate) query.append("endDate", params.endDate);
  if (params?.callResult) query.append("callResult", params.callResult);
  if (params?.limit) query.append("limit", params.limit.toString());

  const queryString = query.toString();
  const url = `/api/overview/bookings${queryString ? `?${queryString}` : ""}`;

  const response = await apiGet<any>(url);
  const bookings = response.data?.data || response.data?.bookings || [];
  return { success: true, data: bookings };
}

/**
 * Get a single lead booking by ID
 */
export async function getLeadBookingById(
  bookingId: string
): Promise<LeadBookingResponse> {
  const response = await apiGet<LeadBookingResponse>(
    `/api/overview/bookings/${bookingId}`
  );
  return response.data;
}

/**
 * Create a new lead booking
 */
export async function createLeadBooking(
  data: CreateLeadBookingParams
): Promise<LeadBookingResponse> {
  const response = await apiPost<LeadBookingResponse>(
    "/api/overview/bookings",
    data
  );
  return response.data;
}

/**
 * Update an existing lead booking
 */
export async function updateLeadBooking(
  bookingId: string,
  data: UpdateLeadBookingParams
): Promise<LeadBookingResponse> {
  const response = await apiPut<LeadBookingResponse>(
    `/api/overview/bookings/${bookingId}`,
    data
  );
  return response.data;
}

/**
 * Get tenant users
 */
export async function getTenantUsers(): Promise<UsersListResponse> {
  const response = await apiGet<any>("/api/overview/users");
  const users = response.data?.data || response.data?.users || [];
  return { success: true, data: users };
}

/**
 * Get dashboard calls with optional date range filters
 */
export async function getDashboardCalls(
  params?: GetDashboardCallsParams
): Promise<CallLogListResponse> {
  const query = new URLSearchParams();

  if (params?.startDate) query.append("startDate", params.startDate);
  if (params?.endDate) query.append("endDate", params.endDate);
  if (params?.user_id) query.append("user_id", params.user_id);

  const queryString = query.toString();
  const url = `/api/overview/calls${queryString ? `?${queryString}` : ""}`;

  const res = await apiGet<any>(url);

  // Handle new structure { success, data: { summary, logs } }
  const summary: CallSummary[] = res.data?.data?.summary || res.data?.summary || [];
  const logsRaw: any[] = res.data?.data?.logs || res.data?.logs || [];

  const mappedLogs: CallLog[] = logsRaw.map((r: any) => {
    const leadFullName = [r.lead_first_name, r.lead_last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    return {
      id: String(
        r.id ??
          r.call_id ??
          r.call_log_id ??
          r.uuid ??
          (typeof crypto !== "undefined"
            ? crypto.randomUUID()
            : Math.random().toString(36).substring(7))
      ),
      from:
        r.agent ||
        r.initiated_by ||
        r.from ||
        r.from_number ||
        r.fromnum ||
        r.source ||
        r.from_number_id ||
        "-",
      to: r.to || r.to_number || r.tonum || "-",
      startedAt:
        r.startedAt ||
        r.started_at ||
        r.created_at ||
        r.createdAt ||
        r.start_time ||
        r.timestamp ||
        r.call_date ||
        "",
      endedAt: r.endedAt ?? r.ended_at ?? r.end_time ?? undefined,
      status: r.status || r.call_status || r.result || "unknown",
      recordingUrl:
        r.recordingUrl ?? r.call_recording_url ?? r.recording_url ?? undefined,
      timeline: r.timeline,
      agentName: r.agent_name ?? r.agent ?? r.voice ?? undefined,
      leadName:
        leadFullName ||
        (r.lead_name ?? r.target ?? r.client_name ?? r.customer_name ?? undefined),
      duration_seconds:
        r.duration_seconds ?? r.call_duration ?? r.duration ?? undefined,
      call_date: r.call_date,
    };
  });

  return {
    success: true,
    data: {
      summary,
      logs: mappedLogs,
    },
  };
}

/**
 * Get wallet/credits statistics
 */
export async function getWalletStats(): Promise<WalletStatsResponse> {
  const response = await apiGet<any>("/api/billing/wallet");
  const walletData = response.data;

  const balance =
    walletData?.wallet?.availableBalance ||
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
    },
  };
}

/**
 * Get available phone numbers
 */
export async function getAvailableNumbers(): Promise<PhoneNumberListResponse> {
  const response = await apiGet<any>("/api/voice-agent/available-numbers");
  const numbers = response.data?.numbers || response.data?.items || [];
  return { success: true, data: numbers };
}

/**
 * Get available voice agents
 */
export async function getAvailableAgents(): Promise<VoiceAgentListResponse> {
  const response = await apiGet<any>("/api/voice-agent/available-agents");
  const agents = response.data?.data || response.data?.agents || response.data?.items || [];
  return { success: true, data: agents };
}
