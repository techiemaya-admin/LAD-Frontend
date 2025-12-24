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
  leadId: string | number;
  userId: string | number;
  userName?: string;
  userEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
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
export interface UnavailableSlotsResponse {
  available_slots: Array<{
    startTime: string;
    endTime: string;
  }>;
}

/**
 * Fetch booked slots for a lead
 */
export const fetchBookings = async (params: {
  leadId: string | number;
  date?: string;
}): Promise<BookingResponse[]> => {
  try {
    // Build query string
    const queryParts: string[] = [`leadId=${encodeURIComponent(String(params.leadId))}`];
    
    if (params.date) {
      queryParts.push(`date=${encodeURIComponent(params.date)}`);
    }
    
    const queryString = `?${queryParts.join('&')}`;
    const response = await api.get(`/api/deals-pipeline/bookings${queryString}`);
    
    return response.data.data || [];
    
  } catch (error: any) {
    // If 404, return empty array (no bookings yet)
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
    const queryParts: string[] = [
      `userId=${encodeURIComponent(String(params.userId))}`,
      `date=${encodeURIComponent(params.date)}`,
    ];
    
    if (params.startTime) {
      queryParts.push(`startTime=${encodeURIComponent(params.startTime)}`);
    }
    if (params.endTime) {
      queryParts.push(`endTime=${encodeURIComponent(params.endTime)}`);
    }
    
    const queryString = `?${queryParts.join('&')}`;
    const response = await api.get(`/api/deals-pipeline/availability${queryString}`);
    
    return {
      available: response.data.available ?? true,
      message: response.data.message,
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
 * Fetch all unavailable slots for a user on a specific date
 */
export const fetchUnavailableSlots = async (
  userId: string | number,
  date: string
): Promise<UnavailableSlotsResponse> => {
  try {
    const tzOffsetMinutes = -new Date().getTimezoneOffset();
    
    const queryString = `?userId=${encodeURIComponent(String(userId))}&date=${encodeURIComponent(date)}&tzOffset=${encodeURIComponent(String(tzOffsetMinutes))}`;
    const response = await api.get(`/api/deals-pipeline/bookings/availability${queryString}`);
    
    return response.data;
    
  } catch (error: any) {
    
    if (error.response?.status === 404) {
      return { available_slots: [] };
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
      userId: bookingData.userId,
      date: bookingData.date,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
    };
    
    const response = await api.post('/api/deals-pipeline/bookings', payload);
    
    return response.data.data;
    
  } catch (error: any) {
    throw new Error(
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to book slot'
    );
  }
};







