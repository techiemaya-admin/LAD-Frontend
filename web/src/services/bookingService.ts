import api from './api';

export interface BookingParams {
  leadId: string | number;
  userId: string | number;
  date: string;
  startTime: string;
  endTime: string;
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
    
    const response = await api.get('/api/deals-pipeline/booking', {
      params: queryParams,
    });
    
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
 * Book a slot for a lead with a user
 */
export const bookSlot = async (bookingData: BookingParams): Promise<BookingResponse> => {
  try {
    const payload = {
      leadId: bookingData.leadId,
      counsellorId: bookingData.userId,
      date: bookingData.date,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
    };
    
    const response = await api.post('/api/deals-pipeline/booking', payload);
    
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
    await api.delete(`/api/deals-pipeline/booking/${bookingId}`);
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

