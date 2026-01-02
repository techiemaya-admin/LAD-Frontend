import api from './api';

export interface BookingParams {
  leadId: string | number;
  userId: string | number;
  date: string;
  startTime: string;
  endTime: string;

  // New bookings API fields (optional for backward compatibility)
  tenantId?: string;
  studentId?: string;
  assignedUserId?: string;
  createdBy?: string;
  bookingType?: string;
  bookingSource?: string;
}

export interface BookingResponse {
  id: string | number;
  leadId?: string | number;
  userId: string | number;
  userName?: string;
  userEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
  start_time?: string;
  end_time?: string; 
  created_at?: string;
}

export interface AvailabilityParams {
  userId: string | number;
  date: string;
  startTime?: string;  
  endTime?: string;     
}

export interface AvailabilityResponse {
  available: boolean;
  message?: string;
}

export interface BookingAvailabilityParams {
  userId: string | number;
  dayStart: string; // ISO string (backend expects Z)
  dayEnd: string; // ISO string (backend expects Z)
  slotMinutes: number;
}

export interface BookingAvailabilitySlot {
  start: string;
  end: string;
  [key: string]: any;
}

export interface BookingAvailabilityResult {
  availableSlots: BookingAvailabilitySlot[];
  bookings: BookingAvailabilitySlot[];
  raw?: any;
}

export interface AvailabilitySlotsResult {
  availableSlots: BookingAvailabilitySlot[];
  bookings: BookingAvailabilitySlot[];
  raw?: any;
}

const BOOKINGS_PATH = '/api/deals-pipeline/bookings';
const LEGACY_BOOKINGS_PATH = '/api/deals-pipeline/booking';

// Interface for fetching all booked/occupied slots for a user on a date
// Note: Despite the field name 'available_slots' from backend, this actually contains BOOKED/OCCUPIED times
// (times when the user is busy and cannot accept new bookings)
export interface UnavailableSlotsResponse {
  available_slots?: Array<{
    startTime: string;
    endTime: string;
  }>;
  bookedSlots?: Array<{
    startTime: string;
    endTime: string;
    leadId?: string | number;
  }>;
  // API might return different structures
  [key: string]: any;
}

/**
 * Fetch booked slots for a lead
 */
export const fetchBookings = async (params: {
  leadId?: string | number;
  date?: string;
}): Promise<BookingResponse[]> => {
  try {
    const queryParams: Record<string, string> = {};
    
    if (params.leadId) {
      queryParams.leadId = String(params.leadId);
    }
    
    if (params.date) {
      queryParams.date = params.date;
    }
    
    // Be generous with query key names, backend variations exist.
    if (params.leadId) {
      queryParams.lead_id = String(params.leadId);
      queryParams.leadId = String(params.leadId);
    }

    let response;
    try {
      response = await api.get(BOOKINGS_PATH, { params: queryParams });
    } catch (e: any) {
      if (e?.response?.status === 404) {
        response = await api.get(LEGACY_BOOKINGS_PATH, { params: queryParams });
      } else {
        throw e;
      }
    }
    
    const bookings = Array.isArray(response.data) 
      ? response.data 
      : Array.isArray(response.data?.data) 
        ? response.data.data 
        : [];
    
    // Filter out cancelled bookings
    return bookings.filter((booking: any) => {
      const status = booking.status?.toLowerCase();
      return status !== 'cancelled' && status !== 'canceled';
    });
    
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    
    throw new Error(
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to fetch bookings'
    );
  }
};

/**
 * Check availability of a booking slot
 */
export const checkAvailability = async (params: AvailabilityParams): Promise<AvailabilityResponse> => {
  try {
    const requestParams: any = {
      counsellorId: params.userId,
      date: params.date,
    };
    
    if (params.startTime) {
      requestParams.startTime = params.startTime;
    }
    if (params.endTime) {
      requestParams.endTime = params.endTime;
    }
    
    const response = await api.get('/api/deals-pipeline/availability', {
      params: requestParams
    });
    
    return {
      available: response.data?.available ?? true,
      message: response.data?.message,
    };
    
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { available: true, message: 'Availability check not available' };
    }
    
    throw new Error(
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to check availability'
    );
  }
};

/**
 * Fetch availability slots and existing bookings for a user for a day range.
 * GET /api/deals-pipeline/bookings/availability?userId=...&dayStart=...&dayEnd=...&slotMinutes=...
 */
export const fetchBookingAvailability = async (
  params: BookingAvailabilityParams
): Promise<BookingAvailabilityResult> => {
  try {
    const response = await api.get(`${BOOKINGS_PATH}/availability`, {
      params: {
        userId: params.userId,
        dayStart: params.dayStart,
        dayEnd: params.dayEnd,
        slotMinutes: params.slotMinutes,
      },
    });

    const data = response.data;

    const availableSlots: BookingAvailabilitySlot[] =
      (Array.isArray(data?.availableSlots) && data.availableSlots) ||
      (Array.isArray(data?.available_slots) && data.available_slots) ||
      (Array.isArray(data?.slots) && data.slots) ||
      (Array.isArray(data) && data) ||
      [];

    const bookings: BookingAvailabilitySlot[] =
      (Array.isArray(data?.bookings) && data.bookings) ||
      (Array.isArray(data?.previousBookings) && data.previousBookings) ||
      (Array.isArray(data?.previous_bookings) && data.previous_bookings) ||
      [];

    return { availableSlots, bookings, raw: data };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { availableSlots: [], bookings: [], raw: null };
    }

    throw new Error(
      error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch booking availability'
    );
  }
};

/**
 * Fetch all booked/occupied slots for a user on a specific date
 * Despite the function name, this returns BOOKED/OCCUPIED slots (times when user is busy)
 * This is used to prevent users from booking slots that conflict with existing bookings
 * Uses GET /api/availability?counsellorId=...&date=... (without startTime/endTime)
 */
export const fetchUnavailableSlots = async (
  userId: string | number,
  date: string
): Promise<UnavailableSlotsResponse> => {
  try {
    const tzOffsetMinutes = -new Date().getTimezoneOffset();
    
    const response = await api.get('/api/deals-pipeline/availability', {
      params: {
        counsellorId: userId,
        date,
        tzOffset: tzOffsetMinutes,
      }
    });

    return typeof response.data === 'object' ? response.data : {};
    
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {};
    }
    
    throw new Error(
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to fetch unavailable slots'
    );
  }
};

/**
 * Fetch available slots and existing bookings for a counsellor on a date.
 * Uses GET /api/deals-pipeline/availability (legacy/compat endpoint).
 *
 * Note: Backend implementations vary; this function is intentionally tolerant
 * to different response shapes.
 */
export const fetchAvailabilitySlots = async (params: {
  userId: string | number;
  date: string;
  slotMinutes?: number;
}): Promise<AvailabilitySlotsResult> => {
  try {
    const tzOffsetMinutes = -new Date().getTimezoneOffset();
    const response = await api.get('/api/deals-pipeline/availability', {
      params: {
        counsellorId: params.userId,
        date: params.date,
        slotMinutes: params.slotMinutes,
        tzOffset: tzOffsetMinutes,
      },
    });

    const data = response.data;

    const availableSlots: BookingAvailabilitySlot[] =
      (Array.isArray(data?.availableSlots) && data.availableSlots) ||
      (Array.isArray(data?.available_slots) && data.available_slots) ||
      (Array.isArray(data?.slots) && data.slots) ||
      (Array.isArray(data?.timeSlots) && data.timeSlots) ||
      (Array.isArray(data) && data) ||
      [];

    const bookings: BookingAvailabilitySlot[] =
      (Array.isArray(data?.bookings) && data.bookings) ||
      (Array.isArray(data?.bookedSlots) && data.bookedSlots) ||
      (Array.isArray(data?.booked_slots) && data.booked_slots) ||
      (Array.isArray(data?.previousBookings) && data.previousBookings) ||
      (Array.isArray(data?.previous_bookings) && data.previous_bookings) ||
      [];

    return { availableSlots, bookings, raw: data };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return { availableSlots: [], bookings: [], raw: null };
    }

    throw new Error(
      error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        'Failed to fetch availability slots'
    );
  }
};

/**
 * Book a slot for a lead with a user
 */
export const bookSlot = async (bookingData: BookingParams): Promise<BookingResponse> => {
  try {
    const booking_time = bookingData.startTime;
    const booking_date = bookingData.date;
    const scheduled_at = `${booking_date}T${booking_time}:00Z`;

    // New API expects snake_case keys (per provided payload).
    const payload: Record<string, any> = {
      tenant_id: bookingData.tenantId,
      // In this flow, student_id is the same as lead_id
      student_id: bookingData.studentId ?? String(bookingData.leadId),
      lead_id: bookingData.leadId,
      counsellor_id: bookingData.userId,
      assigned_user_id: bookingData.assignedUserId,
      booking_type: bookingData.bookingType || 'manual_followup',
      booking_source: bookingData.bookingSource || 'user_ui',
      booking_time,
      booking_date,
      scheduled_at,
      created_by: bookingData.createdBy,
    };

    // Remove undefined keys to avoid backend validation issues.
    Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

    let response;
    try {
      response = await api.post(BOOKINGS_PATH, payload);
    } catch (e: any) {
      // Fallback to legacy booking endpoint if needed.
      if (e?.response?.status === 404) {
        const legacyPayload = {
          leadId: bookingData.leadId,
          counsellorId: bookingData.userId,
          date: bookingData.date,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
        };
        response = await api.post(LEGACY_BOOKINGS_PATH, legacyPayload);
      } else {
        throw e;
      }
    }
    
    return response.data?.data || response.data?.booking || response.data;
    
  } catch (error: any) {
    const errorMessage = 
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.response?.data?.detail ||
      error.message ||
      'Failed to book slot. Please try again.';
    
    throw new Error(errorMessage);
  }
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (bookingId: string | number): Promise<void> => {
  try {
    try {
      await api.delete(`${BOOKINGS_PATH}/${bookingId}`);
    } catch (e: any) {
      if (e?.response?.status === 404) {
        await api.delete(`${LEGACY_BOOKINGS_PATH}/${bookingId}`);
      } else {
        throw e;
      }
    }
  } catch (error: any) {
    if (error.response?.status === 404) {
      return;
    }
    
    throw new Error(
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to cancel booking'
    );
  }
};

/**
 * Fetch users list
 */
export interface User {
  id: string | number;
  name: string;
  email: string;
}

export const fetchUsers = async (): Promise<User[]> => {
  try {
    const response = await api.get('/api/deal-pipeline/counsellors');
    
    const users = Array.isArray(response.data)
      ? response.data
      : Array.isArray(response.data?.counsellors)
        ? response.data.counsellors
        : Array.isArray(response.data?.data)
          ? response.data.data
          : [];
    
    return users.map((user: any) => ({
      id: user.id || user._id,
      name: user.name || user.full_name || '',
      email: user.email || ''
    }));
    
  } catch (error: any) {
    if (error.response?.status === 404) {
      return [];
    }
    
    throw new Error(
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to fetch users'
    );
  }
};

