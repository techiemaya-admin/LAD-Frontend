'use client';
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Calendar, Clock, User, CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@/components/ui/dialog';
import * as bookingService from '@/services/bookingService';
import * as leadsService from '@lad/frontend-features/deals-pipeline';
import { selectPipelineSettings } from '@/store/slices/uiSlice';
import { selectUser } from '@/store/slices/authSlice';
import { logger } from '@/lib/logger';
interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  date: string;
  isBooked: boolean;
  status?: string;
  bookingType?: string;
  retryCount?: number;
  bookedBy?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
}
interface BookingSlotProps {
  leadId: string | number;
  tenantId?: string;
  studentId?: string;
  assignedUserId?: string;
  createdBy?: string;
  users?: Array<{
    id: string | number;
    name: string;
    email: string;
  }>;
  isEditMode?: boolean;
}
// Simple toast notification helper
const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-yellow-500';
  const toast = document.createElement('div');
  toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg fixed bottom-4 right-4 z-50 max-w-sm`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
};
const BookingSlot: React.FC<BookingSlotProps> = ({
  leadId,
  tenantId,
  studentId,
  assignedUserId,
  createdBy,
  users = [],
  isEditMode = false,
}) => {
  // Get pipeline settings from Redux
  const pipelineSettings = useSelector(selectPipelineSettings);
  const currentUser = useSelector(selectUser);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<TimeSlot[]>([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [selectedSlotForBooking, setSelectedSlotForBooking] = useState<TimeSlot | null>(null);
  const [startTime, setStartTime] = useState<string>('09:00');
  const [endTime, setEndTime] = useState<string>('18:00');
  // Add state to track booked time ranges for validation
  const [bookedTimeRanges, setBookedTimeRanges] = useState<Array<{ startTime: string; endTime: string }>>([]);
  const [showAllBookedAppointments, setShowAllBookedAppointments] = useState(false);
  // New bookings payload field
  const [bookingType, setBookingType] = useState<string>('manual_followup');
  // Optional notes for this appointment
  const [bookingNotes, setBookingNotes] = useState<string>('');
  // If logged-in user is present, use it as default counsellor/user.
  useEffect(() => {
    if (!selectedUser && createdBy) {
      setSelectedUser(String(createdBy));
    }
  }, [createdBy, selectedUser]);
  // Availability + existing bookings for the selected user/day
  const [availableSlots, setAvailableSlots] = useState<Array<{ startTime: string; endTime: string }>>([]);
  const [previousBookingsForUser, setPreviousBookingsForUser] = useState<Array<{ startTime: string; endTime: string }>>([]);
  const toZonedIsoLikeBackend = (date: string, time: string): string => {
    // Backend examples use a Z suffix without local conversion.
    return `${date}T${time}:00Z`;
  };
  const extractHHMM = (value: string): string => {
    if (!value) return '';
    // If already HH:MM
    if (/^\d{2}:\d{2}$/.test(value)) return value;
    // If ISO-like
    const tIndex = value.indexOf('T');
    if (tIndex !== -1 && value.length >= tIndex + 6) {
      return value.slice(tIndex + 1, tIndex + 6);
    }
    // If HH:MM:SS
    const parts = value.split(':');
    if (parts.length >= 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
    return value;
  };
  const normalizeSlot = (slot: any): { startTime: string; endTime: string } | null => {
    const start = slot?.start || slot?.startTime || slot?.start_time || slot?.scheduled_at || '';
    const end = slot?.end || slot?.endTime || slot?.end_time || slot?.ends_at || '';
    const startTime = extractHHMM(String(start));
    const endTime = extractHHMM(String(end));
    if (!startTime || !endTime) return null;
    return { startTime, endTime };
  };
  const expandTo15MinSlots = (
    ranges: Array<{ startTime: string; endTime: string }>,
    intervalMinutes = 15
  ): Array<{ startTime: string; endTime: string }> => {
    const parseMinutes = (t: string): number => {
      const [h, m] = t.split(':').map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return -1;
      return h * 60 + m;
    };
    const toHHMM = (mins: number): string => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };
    const expanded: Array<{ startTime: string; endTime: string }> = [];
    for (const r of ranges) {
      const startMins = parseMinutes(r.startTime);
      const endMins = parseMinutes(r.endTime);
      if (startMins < 0 || endMins < 0) continue;
      if (endMins <= startMins) continue;
      // Expand into 15-min chunks.
      for (let t = startMins; t + intervalMinutes <= endMins; t += intervalMinutes) {
        expanded.push({ startTime: toHHMM(t), endTime: toHHMM(t + intervalMinutes) });
      }
    }
    // De-dupe
    const seen = new Set<string>();
    return expanded.filter((s) => {
      const key = `${s.startTime}-${s.endTime}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  // Generate time slots for the selected date (15-minute intervals from start time to end time)
  const generateTimeSlots = (date: string, start: string, end: string): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const intervalMinutes = 15;
    // Parse start and end times
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    const startTotalMinutes = startHour * 60 + startMinute;
    const endTotalMinutes = endHour * 60 + endMinute;
    // Generate slots in 15-minute intervals
    for (let totalMinutes = startTotalMinutes; totalMinutes < endTotalMinutes; totalMinutes += intervalMinutes) {
      const hour = Math.floor(totalMinutes / 60);
      const minute = totalMinutes % 60;
      const slotStartTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const slotEndTotalMinutes = totalMinutes + intervalMinutes;
      const endHourAdjusted = Math.floor(slotEndTotalMinutes / 60);
      const endMinuteAdjusted = slotEndTotalMinutes % 60;
      const slotEndTime = `${endHourAdjusted.toString().padStart(2, '0')}:${endMinuteAdjusted.toString().padStart(2, '0')}`;
      // Don't create slots that go beyond the end time
      if (slotEndTotalMinutes > endTotalMinutes) {
        break;
      }
      slots.push({
        id: `${date}-${slotStartTime}`,
        startTime: slotStartTime,
        endTime: slotEndTime,
        date,
        isBooked: false,
      });
    }
    return slots;
  };
  const fetchBookedSlots = async (date?: string) => {
    try {
      const params: {
        leadId?: string | number;
        date?: string;
      } = {};
      params.leadId = leadId;
      if (isEditMode && date) {
        params.date = date;
      }
      logger.debug('Fetching bookings with params', params);
      const bookings = await bookingService.fetchBookings(params);
      logger.debug('Received bookings', { count: bookings?.length || 0 });
      // Map API response to component format
      const mappedBookings: TimeSlot[] = bookings.map((booking: any) => {
        // New bookings API: scheduled_at = start, buffer_until = end
        const startValue =
          booking.scheduled_at ||
          booking.start_time ||
          booking.startTime ||
          booking.booking_time ||
          '';
        const endValue = booking.buffer_until || booking.end_time || booking.endTime || '';
        const dateStr =
          typeof startValue === 'string' && startValue.includes('T')
            ? startValue.slice(0, 10)
            : booking.booking_date || booking.date || '';
        const startTimeStr = extractHHMM(String(startValue || '')) || extractHHMM(String(booking.startTime || ''));
        const endTimeStr = extractHHMM(String(endValue || '')) || extractHHMM(String(booking.endTime || ''));
        const status = String(booking.status || '').toLowerCase();
        const bookingTypeValue =
          booking.booking_type ||
          booking.bookingType ||
          booking.type ||
          '';
        const retryCountValueRaw = booking.retry_count ?? booking.retryCount;
        const retryCountValue =
          typeof retryCountValueRaw === 'number'
            ? retryCountValueRaw
            : retryCountValueRaw != null
              ? Number(retryCountValueRaw)
              : 0;
        const userId =
          booking.counsellor_id ||
          booking.counsellorId ||
          booking.user_id ||
          booking.userId ||
          booking.assigned_user_id ||
          booking.created_by;
        const user = users.find((c) => String(c.id) === String(userId));
        return {
          id: booking.id || String(Date.now() + Math.random()),
          date: dateStr,
          startTime: startTimeStr,
          endTime: endTimeStr,
          isBooked: true,
          status,
          bookingType: String(bookingTypeValue || ''),
          retryCount: Number.isFinite(retryCountValue) ? retryCountValue : 0,
          userId: userId,
          userName:
            user?.name ||
            booking.counsellor_name ||
            booking.counsellorName ||
            booking.user_name ||
            booking.userName ||
            '',
          userEmail:
            user?.email ||
            booking.counsellor_email ||
            booking.counsellorEmail ||
            booking.user_email ||
            booking.userEmail ||
            '',
          bookedBy:
            user?.name ||
            booking.counsellor_name ||
            booking.counsellorName ||
            booking.user_name ||
            booking.userName ||
            '',
        };
      });
      // Sort: completed at bottom, newest scheduled_at first
      const statusRank = (s?: string) => {
        const v = String(s || '').toLowerCase();
        if (v === 'completed') return 2;
        if (v === 'cancelled' || v === 'canceled') return 3;
        return 1; // scheduled/other
      };
      const toSortDate = (slot: TimeSlot) => {
        if (slot.date && slot.startTime) {
          const iso = `${slot.date}T${slot.startTime}:00Z`;
          const d = new Date(iso);
          if (!isNaN(d.getTime())) return d.getTime();
        }
        return 0;
      };
      const sortedBookings = [...mappedBookings]
        .filter((b) => b.date && b.startTime)
        .sort((a, b) => {
          const rank = statusRank(a.status) - statusRank(b.status);
          if (rank !== 0) return rank;
          return toSortDate(b) - toSortDate(a); // newest first
        });
      logger.debug('Final mapped bookings', { count: sortedBookings?.length || 0 });
      setBookedSlots(sortedBookings);
      setShowAllBookedAppointments(false);
      // Mark slots as booked (only in edit mode when we have time slots)
      if (isEditMode && date) {
        setTimeSlots((prevSlots) =>
          prevSlots.map((slot) => {
            const booked = mappedBookings.find(
              (b) =>
                b.date === slot.date &&
                b.startTime === slot.startTime
            );
            return booked
              ? {
                  ...slot,
                  isBooked: true,
                  bookedBy: booked.bookedBy,
                  userId: booked.userId,
                  userName: booked.userName,
                  userEmail: booked.userEmail,
                }
              : slot;
          })
        );
      }
    } catch (error) {
      logger.error('Error fetching booked slots', error);
      setBookedSlots([]);
      if (isEditMode && date) {
        setTimeSlots(generateTimeSlots(date, startTime, endTime));
      }
    }
  };
  // Fetch booked slots - all bookings in view mode, specific date in edit mode
  useEffect(() => {
    const loadBookedSlots = async () => {
      try {
        setLoading(true);
        if (isEditMode) {
          // In edit mode, fetch for selected date
          if (selectedDate) {
            await fetchBookedSlots(selectedDate);
          }
        } else {
          // In view mode, fetch all bookings for the lead/student
          await fetchBookedSlots();
        }
      } catch (error) {
        logger.error('Error in loadBookedSlots', error);
        // If endpoint doesn't exist, just initialize slots (only in edit mode)
        if (isEditMode && selectedDate) {
          setTimeSlots(generateTimeSlots(selectedDate, startTime, endTime));
        }
      } finally {
        setLoading(false);
      }
    };
    loadBookedSlots();
  }, [selectedDate, leadId, startTime, endTime, isEditMode, users.length]);
  const fetchAvailabilityForUserDay = async (userId: string, date: string) => {
    if (!userId || !date) return;
    try {
      logger.debug('Fetching availability with settings', {
        userId,
        date,
        timezone: pipelineSettings.timezone,
        businessHoursStart: pipelineSettings.businessHoursStart,
        businessHoursEnd: pipelineSettings.businessHoursEnd
      });
      // Calculate dayStart and dayEnd based on business hours and timezone
      const businessStart = pipelineSettings.businessHoursStart || '00:00';
      const businessEnd = pipelineSettings.businessHoursEnd || '23:59';
      const timezone = pipelineSettings.timezone || 'UTC';
      // Prefer legacy /availability endpoint for slot lists (per requirement), with fallback.
      let rawAvailable: any[] = [];
      let rawBookings: any[] = [];
      try {
        const availability = await bookingService.fetchAvailabilitySlots({
          userId,
          date,
          slotMinutes: 15,
          timezone,
          businessHoursStart: businessStart,
          businessHoursEnd: businessEnd
        });
        rawAvailable = availability.availableSlots || [];
        rawBookings = availability.bookings || [];
      } catch {
        // Fallback to /bookings/availability if /availability isn't supported.
        const dayStart = `${date}T${businessStart}:00Z`;
        const dayEnd = `${date}T${businessEnd}:59Z`;
        const result = await bookingService.fetchBookingAvailability({
          userId,
          dayStart,
          dayEnd,
          slotMinutes: 15,
          timezone
        });
        rawAvailable = result.availableSlots || [];
        rawBookings = result.bookings || [];
      }
      const normalizedAvailableRanges = (rawAvailable || [])
        .map(normalizeSlot)
        .filter(Boolean) as Array<{ startTime: string; endTime: string }>;
      const normalizedBookings = (rawBookings || [])
        .map(normalizeSlot)
        .filter(Boolean) as Array<{ startTime: string; endTime: string }>;
      const expandedAvailable = expandTo15MinSlots(normalizedAvailableRanges, 15);
      const sortedAvailable = [...expandedAvailable].sort((a, b) => a.startTime.localeCompare(b.startTime));
      setAvailableSlots(sortedAvailable);
      setPreviousBookingsForUser(normalizedBookings);
      // bookedTimeRanges is used for enabling the Book button.
      setBookedTimeRanges(sortedAvailable);
      // Auto-select the first available slot when date changes (or when current selection is no longer valid)
      if (sortedAvailable.length === 0) {
        setStartTime('');
        setEndTime('');
      } else {
        const hasCurrent = sortedAvailable.some((s) => s.startTime === startTime && s.endTime === endTime);
        if (!hasCurrent) {
          setStartTime(sortedAvailable[0].startTime);
          setEndTime(sortedAvailable[0].endTime);
        }
      }
    } catch (error) {
      logger.error('Error fetching availability', error);
      setAvailableSlots([]);
      setPreviousBookingsForUser([]);
      setBookedTimeRanges([]);
      setStartTime('');
      setEndTime('');
    }
  };
  // Helper function to check if a user-selected time range is WITHIN available slots
  // Returns true (button ENABLED) if the selected time is completely within at least one available slot
  // Returns false (button DISABLED) if the selected time falls outside all available slots or only partially overlaps
  const isTimeRangeBooked = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) {
      return false;
    }
    if (bookedTimeRanges.length === 0) {
      return false;
    }
    const parseTime = (timeStr: string): number => {
      if (!timeStr || !timeStr.includes(':')) {
        return -1;
      }
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        return -1;
      }
      return hours * 60 + minutes;
    };
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    if (startMinutes < 0 || endMinutes < 0) {
      return false;
    }
    // Check if the selected time falls COMPLETELY WITHIN any available slot
    // User can select partial available slots (e.g., 09:00-09:30 within 09:00-10:00 available slot)
    for (let i = 0; i < bookedTimeRanges.length; i++) {
      const availableSlot = bookedTimeRanges[i];
      if (!availableSlot.startTime || !availableSlot.endTime) {
        continue;
      }
      const slotStartMinutes = parseTime(availableSlot.startTime);
      const slotEndMinutes = parseTime(availableSlot.endTime);
      if (slotStartMinutes < 0 || slotEndMinutes < 0) {
        continue;
      }
      // Handle edge case: times crossing midnight (e.g., 23:45-00:00)
      // When a slot ends at "00:00" (midnight), treat it as 1440 minutes (end of 24-hour day)
      const normalizedUserStart = startMinutes;
      const normalizedUserEnd = endMinutes === 0 && endTime !== '00:00' ? 1440 : endMinutes;
      const normalizedSlotStart = slotStartMinutes;
      const normalizedSlotEnd = slotEndMinutes === 0 && availableSlot.endTime !== '00:00' ? 1440 : slotEndMinutes;
      // Check if user's selected time is COMPLETELY WITHIN the available slot
      // User can select partial available slot: userStart >= slotStart AND userEnd <= slotEnd
      const isWithinSlot = (normalizedUserStart >= normalizedSlotStart && normalizedUserEnd <= normalizedSlotEnd);
      if (isWithinSlot) {
        logger.debug('Booking time slot match', { userTime: `${startTime}-${endTime}`, availableSlot: `${availableSlot.startTime}-${availableSlot.endTime}` });
        return true; // ENABLE THE BOOKING - button will be ENABLED
      }
    }
    return false; // DISABLE THE BOOKING - button will be DISABLED
  };
  // Initialize time slots when date, start time, or end time changes
  useEffect(() => {
    if (selectedDate) {
      const slots = generateTimeSlots(selectedDate, startTime, endTime);
      setTimeSlots(slots);
    }
  }, [selectedDate, startTime, endTime]);
  // Fetch unavailable slots when user and date are selected (in edit mode)
  useEffect(() => {
    if (isEditMode && selectedUser && selectedDate) {
      fetchAvailabilityForUserDay(selectedUser, selectedDate);
    }
  }, [selectedUser, selectedDate, isEditMode]);
  const handleSlotClick = (slotId: string) => {
    if (!selectedUser) {
      alert('Please select a user first');
      return;
    }
    const slot = timeSlots.find((s) => s.id === slotId);
    if (!slot || slot.isBooked) {
      return;
    }
    setSelectedSlotForBooking(slot);
    setConfirmDialogOpen(true);
  };
  const handleConfirmBooking = async () => {
    if (!selectedSlotForBooking || !selectedUser) {
      showToast('Please select a user first', 'warning');
      return;
    }
    // student_id is same as lead_id; allow fallback when studentId is not available
    if (!tenantId || !createdBy) {
      showToast('Missing tenant/createdBy. Please refresh and try again.', 'error');
      return;
    }
    try {
      setLoading(true);
      const user = users.find((c) => String(c.id) === selectedUser);
      // Ensure the selected time range is within available slots (client-side guard)
      if (!isTimeRangeBooked(selectedSlotForBooking.startTime, selectedSlotForBooking.endTime)) {
        showToast('This time range is not within available slots. Please select a different time.', 'warning');
        return;
      }
      // Use bookingService to book the slot
      const bookingData: bookingService.BookingParams = {
        leadId: leadId,
        userId: selectedUser,
        date: selectedDate,
        startTime: selectedSlotForBooking.startTime,
        endTime: selectedSlotForBooking.endTime,
        tenantId,
        studentId: studentId || String(leadId),
        assignedUserId: assignedUserId || createdBy,
        createdBy,
        bookingType,
        bookingSource: 'user_ui',
        timezone: pipelineSettings.timezone || 'GST',
      };
      // Validate required fields before sending
      if (!bookingData.leadId) {
        showToast('Lead ID is missing. Cannot create booking.', 'error');
        return;
      }
      if (!bookingData.assignedUserId) {
        showToast('Assigned user ID is missing. Cannot create booking.', 'error');
        return;
      }
      if (!bookingData.createdBy) {
        showToast('Created by user ID is missing. Cannot create booking.', 'error');
        return;
      }
      if (!bookingData.tenantId) {
        showToast('Organization ID is missing. Cannot create booking.', 'error');
        return;
      }
      try {
        await bookingService.bookSlot(bookingData);
      } catch (error: any) {
        console.error('[BookingSlot.handleConfirmBooking] Full error:', error);
        console.error('[BookingSlot.handleConfirmBooking] Error response:', error.response?.data);
        throw error; // Re-throw so the outer catch handles the toast
      }
      // Update the slot as booked
      setTimeSlots((prevSlots) =>
        prevSlots.map((s) =>
          s.id === selectedSlotForBooking.id
            ? {
                ...s,
                isBooked: true,
                bookedBy: user?.name || '',
                userId: selectedUser,
                userName: user?.name || '',
                userEmail: user?.email || '',
              }
            : s
        )
      );
      // Refresh booked slots to show the new booking
      await fetchBookedSlots(isEditMode ? selectedDate : undefined);
      // Refresh unavailable slots to mark the newly booked slot as unavailable for other students
      if (isEditMode && selectedUser && selectedDate) {
        await fetchAvailabilityForUserDay(selectedUser, selectedDate);
      }
      setConfirmDialogOpen(false);
      setSelectedSlotForBooking(null);
      // Save notes separately via leads API if provided
      if (bookingNotes?.trim()) {
        try {
          await leadsService.addLeadNote(leadId, bookingNotes.trim());
        } catch (noteError) {
          console.warn('Booking succeeded but failed to save note:', noteError);
        }
      }
      setBookingNotes('');
      // Show success toast
      showToast(`Booking confirmed with ${user?.name || 'User'} on ${selectedDate} from ${selectedSlotForBooking.startTime} to ${selectedSlotForBooking.endTime}`, 'success');
    } catch (error: any) {
      console.error('[BookingSlot.handleConfirmBooking] Error booking slot:', error);
      // Extract error message - the error.message should already contain the backend message
      let errorMessage = error.message || 'Failed to book slot. Please try again.';
      // Check if it's an availability/unavailability error (should be shown as warning, not error)
      const isAvailabilityError = 
        errorMessage.toLowerCase().includes('unavailable') ||
        errorMessage.toLowerCase().includes('booking') ||
        errorMessage.toLowerCase().includes('buffer period') ||
        errorMessage.toLowerCase().includes('already booked');
      // Show appropriate toast based on error type
      if (isAvailabilityError) {
        showToast(errorMessage, 'warning');
      } else {
        showToast(errorMessage, 'error');
      }
      // Refresh slots to get updated booking status for any error
      if (isEditMode && selectedDate) {
        const slots = generateTimeSlots(selectedDate, startTime, endTime);
        setTimeSlots(slots);
        await fetchBookedSlots(selectedDate);
        // Also refresh availability
        if (selectedUser) {
          await fetchAvailabilityForUserDay(selectedUser, selectedDate);
        }
      }
    } finally {
      setLoading(false);
    }
  };
  const handleCancelBooking = async (slotId: string) => {
    try {
      setLoading(true);
      // Use bookingService to cancel the booking
      await bookingService.cancelBooking(slotId);
      // Update the slot as available
      setTimeSlots((prevSlots) =>
        prevSlots.map((s) =>
          s.id === slotId
            ? {
                ...s,
                isBooked: false,
                bookedBy: undefined,
                userId: undefined,
                userName: undefined,
                userEmail: undefined,
              }
            : s
        )
      );
      // Refresh booked slots after cancellation
      await fetchBookedSlots(isEditMode ? selectedDate : undefined);
      // Refresh unavailable slots to update availability for other students
      if (isEditMode && selectedUser && selectedDate) {
        await fetchAvailabilityForUserDay(selectedUser, selectedDate);
      }
      // Show success toast
      showToast('Booking cancelled successfully!', 'success');
    } catch (error: any) {
      console.error('[BookingSlot.handleCancelBooking] Error cancelling booking:', error);
      const errorMessage = error.message || 'Failed to cancel booking. Please try again.';
      // Show error toast
      showToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };
  const formatTime = (time: string) => {
    if (!time || !time.includes(':')) return time || '—';
    const [hours, minutes = '00'] = time.split(':');
    const hour = parseInt(hours, 10);
    if (Number.isNaN(hour)) return time;
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };
  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
    const date = new Date(dateOnly ? `${dateString}T00:00:00` : dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };
  // If in edit mode, show appointment details view
  if (isEditMode) {
    const visibleBookedSlots = showAllBookedAppointments ? bookedSlots : bookedSlots.slice(0, 5);
    return (
      <div className="space-y-4">
        {/* Booked Appointments List - Enhanced View in Edit Mode */}
        {bookedSlots.length > 0 ? (
          <div>
            <Label className="text-sm text-gray-600 mb-3 block font-medium">
              Booked Appointments ({bookedSlots.length})
            </Label>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {visibleBookedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-4 bg-white border border-green-200 rounded-lg hover:border-green-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {String(slot.status || '').toLowerCase() === 'completed' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Clock className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        )}
                          <div>
                            <div className="text-sm font-semibold text-gray-900 flex flex-wrap items-center gap-x-2">
                              <span>{formatDate(slot.date)}</span>
                              {slot.bookingType ? (
                                <span className="text-xs text-gray-600 font-normal">• {slot.bookingType}</span>
                              ) : null}
                              <span className="text-xs text-gray-600 font-normal">• Retry: {slot.retryCount ?? 0}</span>
                            </div>
                            <div className="text-sm text-gray-700 mt-1">
                              {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                            </div>
                          </div>
                        </div>
                        {slot.userName && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 ml-7">
                            <User className="h-3 w-3" />
                            <span>
                              {slot.userName}
                              {slot.userEmail && ` (${slot.userEmail})`}
                            </span>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelBooking(slot.id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                        disabled={loading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              {bookedSlots.length > 5 && (
                <div className="mt-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => setShowAllBookedAppointments((v) => !v)}
                  >
                    {showAllBookedAppointments ? 'View less' : 'View more'}
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border border-gray-200">
              <Calendar className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">No appointments scheduled</p>
            </div>
          )}
        {/* Allow booking new appointments in edit mode */}
        <div className="pt-4 border-t border-gray-200">
          <Label className="text-sm text-gray-600 mb-3 block font-medium">
            Book New Appointment
          </Label>
          <div className="space-y-4">
            {/* Date Selection */}
            <div>
              <Label htmlFor="appointment-date-edit" className="text-sm text-gray-600 mb-2 block">
                Select Date
              </Label>
              <Input
                id="appointment-date-edit"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full"
              />
            </div>
            {/* User Selection */}
            <div>
              <Label htmlFor="user-select-edit" className="text-sm text-gray-600 mb-2 block">
                Select User
              </Label>
              <Select
                value={selectedUser}
                onValueChange={(value: string) => setSelectedUser(value)}
                disabled={Boolean(createdBy) || users.length === 0}
              >
                <SelectTrigger id="user-select-edit" className="w-full">
                  <SelectValue
                    placeholder={
                      createdBy && currentUser?.email
                        ? `Auto-selected: ${currentUser.email}`
                        : createdBy
                        ? 'Using logged-in user'
                        : users.length === 0
                          ? 'No users available'
                          : 'Choose a user...'
                    }
                  >
                    {selectedUser && currentUser && String(currentUser.id) === selectedUser && currentUser.email
                      ? `${currentUser.name || 'Current User'} (${currentUser.email})`
                      : selectedUser && users.find(u => String(u.id) === selectedUser)
                        ? (() => {
                            const user = users.find(u => String(u.id) === selectedUser);
                            return `${user?.name} ${user?.email ? `(${user.email})` : ''}`;
                          })()
                        : null}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.name} {user.email ? `(${user.email})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!createdBy && users.length === 0 ? (
                <p className="text-xs text-gray-500 mt-2">
                  No counsellors/users loaded, so booking is disabled.
                </p>
              ) : null}
            </div>
            {/* Booking Type */}
            <div>
              <Label htmlFor="booking-type" className="text-sm text-gray-600 mb-2 block">
                Booking Type
              </Label>
              <Select value={bookingType} onValueChange={(value: string) => setBookingType(value)}>
                <SelectTrigger id="booking-type" className="w-full">
                  <SelectValue placeholder="Select booking type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual_followup">manual_followup</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Start Time and End Time Selection - 15 minute intervals */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time-edit" className="text-sm text-gray-600 mb-2 block">
                  Start Time (15 min intervals)
                </Label>
                <select
                  id="start-time-edit"
                  value={startTime}
                  onChange={(e) => {
                    const newStartTime = e.target.value;
                    setStartTime(newStartTime);
                    const matching = availableSlots.find((s) => s.startTime === newStartTime);
                    if (matching) {
                      setEndTime(matching.endTime);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={availableSlots.length === 0}
                >
                  {availableSlots.length === 0 ? (
                    <option value="">No available slots</option>
                  ) : (
                    Array.from(new Set(availableSlots.map((s) => s.startTime))).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <div>
                <Label htmlFor="end-time-edit" className="text-sm text-gray-600 mb-2 block">
                  End Time (15 min intervals)
                </Label>
                <select
                  id="end-time-edit"
                  value={endTime}
                  onChange={(e) => {
                    const newEndTime = e.target.value;
                    const [endHour, endMin] = newEndTime.split(':').map(Number);
                    const endTotalMin = endHour * 60 + endMin;
                    const [startHour, startMin] = startTime.split(':').map(Number);
                    const startTotalMin = startHour * 60 + startMin;
                    if (newEndTime && startTime && endTotalMin > startTotalMin) {
                      setEndTime(newEndTime);
                    } else {
                      alert('End time must be after start time');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={availableSlots.length === 0}
                >
                  {availableSlots.length === 0 ? (
                    <option value="">No available slots</option>
                  ) : (
                    Array.from(
                      new Set(
                        (availableSlots.filter((s) => s.startTime === startTime).length > 0
                          ? availableSlots.filter((s) => s.startTime === startTime).map((s) => s.endTime)
                          : availableSlots.map((s) => s.endTime))
                      )
                    ).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            {/* Availability Preview */}
            {selectedUser && selectedDate && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <Label className="text-xs text-gray-600 block mb-2">
                      Available Slots ({availableSlots.length})
                    </Label>
                    {availableSlots.length === 0 ? (
                      <p className="text-xs text-gray-500">No available slots returned</p>
                    ) : (
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {availableSlots.map((s, idx) => (
                          <div key={`${s.startTime}-${s.endTime}-${idx}`} className="text-xs text-gray-700 flex justify-between">
                            <span>{s.startTime}</span>
                            <span className="text-gray-500">-</span>
                            <span>{s.endTime}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-3">
                    <Label className="text-xs text-gray-600 block mb-2">
                      Previous Bookings ({previousBookingsForUser.length})
                    </Label>
                    {previousBookingsForUser.length === 0 ? (
                      <p className="text-xs text-gray-500">No previous bookings</p>
                    ) : (
                      <div className="max-h-28 overflow-y-auto space-y-1">
                        {previousBookingsForUser.map((b, idx) => (
                          <div key={`${b.startTime}-${b.endTime}-${idx}`} className="text-xs text-gray-700 flex justify-between">
                            <span>{b.startTime}</span>
                            <span className="text-gray-500">-</span>
                            <span>{b.endTime}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            {/* Appointment Notes */}
            <div>
              <Label htmlFor="appointment-notes" className="text-sm text-gray-600 mb-2 block">
                Notes
              </Label>
              <Textarea
                id="appointment-notes"
                rows={3}
                placeholder="Add notes for this appointment (optional)"
                value={bookingNotes}
                onChange={(e) => setBookingNotes(e.target.value)}
              />
            </div>
            {/* Book Slot Button */}
            {startTime && endTime && endTime > startTime && (
              <Button
                onClick={() => {
                  if (!selectedUser) {
                    showToast('Please select a user first', 'warning');
                    return;
                  }
                  // Final validation before booking
                  // isTimeRangeBooked() returns true if time IS WITHIN available slots (valid for booking)
                  // So we should show error only if it returns false (NOT within available slots)
                  if (!isTimeRangeBooked(startTime, endTime)) {
                    showToast('This time range is not within available slots. Please select a different time.', 'warning');
                    return;
                  }
                  const customSlot: TimeSlot = {
                    id: `${selectedDate}-${startTime}`,
                    startTime: startTime,
                    endTime: endTime,
                    date: selectedDate,
                    isBooked: false,
                  };
                  setSelectedSlotForBooking(customSlot);
                  setConfirmDialogOpen(true);
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 transition-all"
                disabled={
                  loading ||
                  !selectedUser ||
                  !isTimeRangeBooked(startTime, endTime)
                }
              >
                <Calendar className="h-4 w-4 mr-2" />
                {!selectedUser ? (
                  <>User not available</>
                ) : !isTimeRangeBooked(startTime, endTime) ? (
                  <>Select Valid Time Within Available Slots</>
                ) : (
                  <>Book Slot ({formatTime(startTime)} - {formatTime(endTime)})</>
                )}
              </Button>
            )}
          </div>
        </div>
        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent showCloseButton={true}>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              Confirm Booking
            </DialogTitle>
            {selectedSlotForBooking && (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Booking Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-700">
                        <strong>Date:</strong> {formatDate(selectedDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-700">
                        <strong>Time:</strong> {formatTime(selectedSlotForBooking.startTime)} - {formatTime(selectedSlotForBooking.endTime)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-700">
                        <strong>Booking Type:</strong> {bookingType}
                      </span>
                    </div>
                    {selectedUser && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-blue-500" />
                        <span className="text-gray-700">
                          <strong>User:</strong>{' '}
                          {users.find((c) => String(c.id) === selectedUser)?.name || 'N/A'}
                          {users.find((c) => String(c.id) === selectedUser)?.email && (
                            <span className="text-gray-500">
                              {' '}({users.find((c) => String(c.id) === selectedUser)?.email})
                            </span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                {/* Booking Information */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-3 text-sm flex items-center gap-2">
                    <svg className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Booking Information
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5">
                      <svg className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <div className="flex-1">
                        <span className="text-gray-600 font-medium">Organization ID</span>
                        <p className="text-gray-900 mt-0.5 font-mono break-all">{tenantId || <span className="text-red-500">Missing</span>}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5">
                      <svg className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <div className="flex-1">
                        <span className="text-gray-600 font-medium">Student / Lead ID</span>
                        <p className="text-gray-900 mt-0.5 font-mono break-all">{studentId || String(leadId)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5">
                      <svg className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <div className="flex-1">
                        <span className="text-gray-600 font-medium">Counsellor / Assigned User</span>
                        <p className="text-gray-900 mt-0.5 font-mono break-all">{String(assignedUserId || createdBy || selectedUser || '')}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5">
                      <svg className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      <div className="flex-1">
                        <span className="text-gray-600 font-medium">Booking Type & Source</span>
                        <p className="text-gray-900 mt-0.5">
                          <span className="font-medium">{bookingType}</span>
                          <span className="text-gray-400 mx-1.5">•</span>
                          <span className="text-gray-600">user_ui</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 bg-white rounded-md p-2.5">
                      <svg className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div className="flex-1">
                        <span className="text-gray-600 font-medium">Scheduled Time</span>
                        <p className="text-gray-900 mt-0.5">{`${selectedDate}T${selectedSlotForBooking.startTime}:00Z`}</p>
                      </div>
                    </div>
                  </div>
                  {(!tenantId || !createdBy) && (
                    <div className="mt-3 flex items-start gap-2 p-2.5 bg-red-50 border border-red-200 rounded-md">
                      <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">
                        Missing required fields (Organization ID / Created By). Booking cannot proceed until resolved.
                      </p>
                    </div>
                  )}
                </div>
                {previousBookingsForUser.length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm">Existing bookings for selected user</h4>
                    <div className="max-h-24 overflow-y-auto space-y-1">
                      {previousBookingsForUser.map((b, idx) => (
                        <div key={`${b.startTime}-${b.endTime}-${idx}`} className="text-xs text-gray-700 flex justify-between">
                          <span>{b.startTime}</span>
                          <span className="text-gray-500">-</span>
                          <span>{b.endTime}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Once confirmed, this slot will be blocked for other users.
                  </p>
                </div>
              </div>
            )}
            <DialogActions>
              <Button
                variant="ghost"
                onClick={() => {
                  setConfirmDialogOpen(false);
                  setSelectedSlotForBooking(null);
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmBooking}
                disabled={loading || !tenantId || !createdBy}
                className="bg-blue-500 hover:bg-blue-600 text-white"
              >
                {loading ? 'Booking...' : 'Confirm Booking'}
              </Button>
            </DialogActions>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  // Normal view mode - show simple display of booked appointments (like other sections)
  const visibleBookedSlots = showAllBookedAppointments ? bookedSlots : bookedSlots.slice(0, 5);
  return (
    <>
      <div className="flex flex-col gap-3">
        {bookedSlots.length > 0 ? (
          visibleBookedSlots.map((slot) => (
            <div key={slot.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                {String(slot.status || '').toLowerCase() === 'completed' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Clock className="h-4 w-4 text-blue-500" />
                )}
                <span className="text-gray-900 font-medium">{formatDate(slot.date)}</span>
                {slot.bookingType ? (
                  <span className="text-gray-600 text-sm">• {slot.bookingType}</span>
                ) : null}
                <span className="text-gray-600 text-sm">• Retry: {slot.retryCount ?? 0}</span>
              </div>
              <div className="flex items-center gap-2 ml-6">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-gray-700">
                  {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                </span>
              </div>
              {slot.userName && (
                <div className="flex items-center gap-2 ml-6">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-600 text-sm">{slot.userName}</span>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">No Slot Scheduled</span>
          </div>
        )}
        {bookedSlots.length > 5 && (
          <div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-blue-600 hover:text-blue-700"
              onClick={() => setShowAllBookedAppointments((v) => !v)}
            >
              {showAllBookedAppointments ? 'View less' : 'View more'}
            </Button>
          </div>
        )}
      </div>
    </>
  );
};
export default BookingSlot;
