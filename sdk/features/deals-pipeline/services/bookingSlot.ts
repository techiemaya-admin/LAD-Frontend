import api from './api';

export interface BookingParams {
  leadId?: string | number;
  studentId?: string | number;
  counsellorId: string | number;
  date: string;
  startTime: string;
  endTime: string;
}

export interface BookingResponse {
  id: string | number;
  leadId?: string | number;
  studentId?: string | number;
  counsellorId: string | number;
  counsellorName?: string;
  counsellorEmail?: string;
  date: string;
  startTime: string;
  endTime: string;
  start_time?: string; // ISO timestamp from backend
  end_time?: string; // ISO timestamp from backend
  created_at?: string;
}

export interface AvailabilityParams {
  counsellorId: string | number;
  date: string;
  startTime?: string;  // Optional - if not provided, fetch all unavailable slots for the date
  endTime?: string;     // Optional - if not provided, fetch all unavailable slots for the date
}

export interface AvailabilityResponse {
  available: boolean;
  message?: string;
}

// Interface for fetching all booked/occupied slots for a counsellor on a date
// Note: Despite the field name 'available_slots' from backend, this actually contains BOOKED/OCCUPIED times
// (times when the counselor is busy and cannot accept new bookings)
export interface UnavailableSlotsResponse {
  available_slots?: Array<{
    startTime: string;
    endTime: string;
  }>;
  bookedSlots?: Array<{
    startTime: string;
    endTime: string;
    studentId?: string | number;
    leadId?: string | number;
  }>;
  // API might return different structures
  [key: string]: any;
}

/**
 * Fetch booked slots for a lead or student
 */
export const fetchBookings = async (params: {
  leadId?: string | number;
  studentId?: string | number;
  date?: string;
}): Promise<BookingResponse[]> => {
  try {
    console.log('[bookingService.fetchBookings] Fetching bookings with params:', params);
    
    // Build query string
    const queryParts: string[] = [];
    
    if (params.studentId) {
      queryParts.push(`studentId=${encodeURIComponent(String(params.studentId))}`);
    } else if (params.leadId) {
      queryParts.push(`leadId=${encodeURIComponent(String(params.leadId))}`);
    }
    
    if (params.date) {
      queryParts.push(`date=${encodeURIComponent(params.date)}`);
    }
    
    const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';
    const response = await api.get(`/api/booking${queryString}`);
    
    console.log('[bookingService.fetchBookings] Raw API response:', response);
    console.log('[bookingService.fetchBookings] response.data:', response.data);
    
    // Handle different response structures
    let bookings: any[] = [];
    
    if (response.data?.success && Array.isArray(response.data.data)) {
      bookings = response.data.data;
    } else if (Array.isArray(response.data)) {
      bookings = response.data;
    } else if (Array.isArray(response.data?.data)) {
      bookings = response.data.data;
    } else if (response.data?.bookings && Array.isArray(response.data.bookings)) {
      bookings = response.data.bookings;
    }
    
    // Filter out cancelled bookings - only return active/booked appointments
    bookings = bookings.filter((booking: any) => {
      const status = booking.status?.toLowerCase();
      // Only include bookings that are not cancelled
      return status !== 'cancelled' && status !== 'canceled';
    });
    
    console.log('[bookingService.fetchBookings] Processed bookings (after filtering cancelled):', bookings.length, 'active bookings');
    return bookings;
    
  } catch (error: any) {
    console.error('[bookingService.fetchBookings] Error fetching bookings:', error);
    
    // If 404, return empty array (no bookings yet)
    if (error.response?.status === 404) {
      console.warn('[bookingService.fetchBookings] Endpoint not found, returning empty array');
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
    console.log('[bookingService.checkAvailability] Checking availability with params:', params);
    
    const queryParts: string[] = [
      `counsellorId=${encodeURIComponent(String(params.counsellorId))}`,
      `date=${encodeURIComponent(params.date)}`,
    ];
    
    // Only include startTime and endTime if provided (for specific slot check)
    if (params.startTime) {
      queryParts.push(`startTime=${encodeURIComponent(params.startTime)}`);
    }
    if (params.endTime) {
      queryParts.push(`endTime=${encodeURIComponent(params.endTime)}`);
    }
    
    const queryString = `?${queryParts.join('&')}`;
    const response = await api.get(`/api/availability${queryString}`);
    
    console.log('[bookingService.checkAvailability] Availability check successful:', response.data);
    
    // Handle different response structures
    if (typeof response.data === 'object') {
      return {
        available: response.data.available ?? true,
        message: response.data.message,
      };
    }
    
    return { available: true };
    
  } catch (error: any) {
    console.error('[bookingService.checkAvailability] Error checking availability:', error);
    
    // If endpoint doesn't exist, assume available (backend will validate)
    if (error.response?.status === 404) {
      console.warn('[bookingService.checkAvailability] Endpoint not found, assuming available');
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
 * Fetch all booked/occupied slots for a counsellor on a specific date
 * Despite the function name, this returns BOOKED/OCCUPIED slots (times when counselor is busy)
 * This is used to prevent users from booking slots that conflict with existing bookings
 * Uses GET /api/availability?counsellorId=...&date=... (without startTime/endTime)
 */
export const fetchUnavailableSlots = async (
  counsellorId: string | number,
  date: string
): Promise<UnavailableSlotsResponse> => {
  try {
    // Calculate user's timezone offset in minutes ahead of UTC
    // Example: IST (UTC+5:30) = 330 minutes
    const tzOffsetMinutes = -new Date().getTimezoneOffset();
    
    console.log('[bookingService.fetchUnavailableSlots] Fetching AVAILABLE slots for counselor:', { counsellorId, date, tzOffsetMinutes });
    
    const queryString = `?counsellorId=${encodeURIComponent(String(counsellorId))}&date=${encodeURIComponent(date)}&tzOffset=${encodeURIComponent(String(tzOffsetMinutes))}`;
    const response = await api.get(`/api/availability${queryString}`);
    
    console.log('[bookingService.fetchUnavailableSlots] Backend returned AVAILABLE slots (in client local timezone):', response.data);
    if (typeof response.data === 'object') {
      return response.data;
    }
    
    return {};
    
  } catch (error: any) {
    console.error('[bookingService.fetchUnavailableSlots] Error fetching AVAILABLE slots:', error);
    
    // If endpoint doesn't exist, return empty (assume all slots are available)
    if (error.response?.status === 404) {
      console.warn('[bookingService.fetchUnavailableSlots] Endpoint not found, returning empty (all slots available)');
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
 * Book a slot for a lead or student with a counsellor
 */
export const bookSlot = async (bookingData: BookingParams): Promise<BookingResponse> => {
  try {
    console.log('[bookingService.bookSlot] Booking slot with data:', bookingData);
    
    // Prepare payload - ensure all required fields are present
    const payload: any = {
      counsellorId: bookingData.counsellorId,
      date: bookingData.date,
      startTime: bookingData.startTime,
      endTime: bookingData.endTime,
    };
    
    // Include leadId or studentId (whichever is available)
    if (bookingData.studentId) {
      payload.studentId = bookingData.studentId;
    } else if (bookingData.leadId) {
      payload.leadId = bookingData.leadId;
    }
    
    console.log('[bookingService.bookSlot] Sending payload:', JSON.stringify(payload, null, 2));
    console.log('[bookingService.bookSlot] Payload fields:', {
      hasCounsellorId: !!payload.counsellorId,
      hasDate: !!payload.date,
      hasStartTime: !!payload.startTime,
      hasEndTime: !!payload.endTime,
      hasStudentId: !!payload.studentId,
      hasLeadId: !!payload.leadId,
      dateFormat: payload.date,
      startTimeFormat: payload.startTime,
      endTimeFormat: payload.endTime,
    });
    
    const response = await api.post('/api/booking', payload);
    
    console.log('[bookingService.bookSlot] Booking successful:', response.data);
    
    // Handle different response structures
    const booking = response.data?.data || response.data?.booking || response.data;
    
    return booking;
    
  } catch (error: any) {
    console.error('[bookingService.bookSlot] Error booking slot:', error);
    console.error('[bookingService.bookSlot] Error response:', error.response?.data);
    console.error('[bookingService.bookSlot] Error status:', error.response?.status);
    
    // Extract detailed error message from backend
    let errorMessage = 'Failed to book slot. Please try again.';
    
    if (error.response?.data) {
      // Try multiple possible error message fields
      errorMessage = 
        error.response.data.error ||
        error.response.data.message ||
        error.response.data.detail ||
        error.response.data.msg ||
        (typeof error.response.data === 'string' ? error.response.data : errorMessage);
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // If it's a 400 error with a specific message, preserve it
    if (error.response?.status === 400 && errorMessage) {
      throw new Error(errorMessage);
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (bookingId: string | number): Promise<void> => {
  try {
    console.log('[bookingService.cancelBooking] Cancelling booking:', bookingId);
    
    await api.delete(`/api/booking/${bookingId}`);
    
    console.log('[bookingService.cancelBooking] Booking cancelled successfully');
    
  } catch (error: any) {
    console.error('[bookingService.cancelBooking] Error cancelling booking:', error);
    
    // If 404, booking might already be deleted - treat as success
    if (error.response?.status === 404) {
      console.warn('[bookingService.cancelBooking] Booking not found (may already be deleted)');
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
 * Fetch counsellors list
 */
export interface Counsellor {
  id: string | number;
  name: string;
  email: string;
}

export const fetchCounsellors = async (): Promise<Counsellor[]> => {
  try {
    console.log('[bookingService.fetchCounsellors] Fetching counsellors...');
    
    const response = await api.get('/api/counsellors');
    
    console.log('[bookingService.fetchCounsellors] Raw API response:', response);
    console.log('[bookingService.fetchCounsellors] response.data:', response.data);
    
    // Handle different response structures
    let counsellors: any[] = [];
    
    if (Array.isArray(response.data)) {
      counsellors = response.data;
    } else if (response.data?.counsellors && Array.isArray(response.data.counsellors)) {
      counsellors = response.data.counsellors;
    } else if (response.data?.data && Array.isArray(response.data.data)) {
      counsellors = response.data.data;
    }
    
    // Map response to expected format
    const mappedCounsellors: Counsellor[] = counsellors.map((counsellor: any) => ({
      id: counsellor.id || counsellor._id,
      name: counsellor.name || counsellor.full_name || '',
      email: counsellor.email || ''
    }));
    
    console.log('[bookingService.fetchCounsellors] Processed counsellors:', mappedCounsellors);
    return mappedCounsellors;
    
  } catch (error: any) {
    console.error('[bookingService.fetchCounsellors] Error fetching counsellors:', error);
    
    // If 404, return empty array
    if (error.response?.status === 404) {
      console.warn('[bookingService.fetchCounsellors] Endpoint not found, returning empty array');
      return [];
    }
    
    throw new Error(
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Failed to fetch counsellors'
    );
  }
};

