'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@/components/ui/dialog';
import * as bookingService from '@/services/bookingService';

interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  date: string;
  isBooked: boolean;
  bookedBy?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
}

interface BookingSlotProps {
  leadId: string | number;
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

const BookingSlot: React.FC<BookingSlotProps> = ({ leadId, users = [], isEditMode = false }) => {
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

      console.log('[BookingSlot.fetchBookedSlots] Fetching bookings with params:', params);
      const bookings = await bookingService.fetchBookings(params);

      console.log('[BookingSlot.fetchBookedSlots] Received bookings:', bookings);

      // Map API response to component format
      const mappedBookings: TimeSlot[] = bookings.map((booking: any) => {
        // Extract date and time from ISO timestamp or use provided values
        const startTimeISO = booking.start_time || booking.startTime;
        const endTimeISO = booking.end_time || booking.endTime;
        
        let dateStr = '';
        let startTimeStr = '';
        let endTimeStr = '';
        
        if (startTimeISO) {
          const startDate = new Date(startTimeISO);
          const year = startDate.getFullYear();
          const month = String(startDate.getMonth() + 1).padStart(2, '0');
          const day = String(startDate.getDate()).padStart(2, '0');
          dateStr = `${year}-${month}-${day}`;
          
          const hours = String(startDate.getHours()).padStart(2, '0');
          const minutes = String(startDate.getMinutes()).padStart(2, '0');
          startTimeStr = `${hours}:${minutes}`;
        } else if (booking.date && booking.startTime) {
          dateStr = booking.date;
          startTimeStr = booking.startTime;
        }
        
        if (endTimeISO) {
          const endDate = new Date(endTimeISO);
          const hours = String(endDate.getHours()).padStart(2, '0');
          const minutes = String(endDate.getMinutes()).padStart(2, '0');
          endTimeStr = `${hours}:${minutes}`;
        } else if (booking.endTime) {
          endTimeStr = booking.endTime;
        }

        const userId = booking.counsellor_id || booking.counsellorId || booking.user_id || booking.userId;
        const user = users.find(c => String(c.id) === String(userId));

        return {
          id: booking.id || String(Date.now() + Math.random()),
          date: dateStr || booking.date || '',
          startTime: startTimeStr || booking.startTime || '',
          endTime: endTimeStr || booking.endTime || '',
          isBooked: true,
          userId: userId,
          userName: user?.name || booking.counsellor_name || booking.counsellorName || booking.user_name || booking.userName || '',
          userEmail: user?.email || booking.counsellor_email || booking.counsellorEmail || booking.user_email || booking.userEmail || '',
          bookedBy: user?.name || booking.counsellor_name || booking.counsellorName || booking.user_name || booking.userName || '',
        };
      });

      console.log('[BookingSlot.fetchBookedSlots] Final mapped bookings:', mappedBookings);
      setBookedSlots(mappedBookings);

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
      console.error('[BookingSlot.fetchBookedSlots] Error fetching booked slots:', error);
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
        console.error('Error fetching booked slots:', error);
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

  // Fetch unavailable slots for a user on a specific date
  // This marks slots as unavailable for ALL students (not
  const fetchUnavailableSlotsForUser = async (userId: string, date: string) => {
    if (!userId || !date) return;
    
    try {
      console.log('[BookingSlot.fetchUnavailableSlotsForUser] Fetching AVAILABLE slots for user:', { userId, date });
      
      const availableSlotsData = await bookingService.fetchUnavailableSlots(userId, date);
      
      console.log('[BookingSlot.fetchUnavailableSlotsForUser] 🔥 RAW RESPONSE from backend:', JSON.stringify(availableSlotsData, null, 2));
      console.log('[BookingSlot.fetchUnavailableSlotsForUser] Received AVAILABLE slots from backend:', availableSlotsData);
      console.log(`
✅ TIMEZONE HANDLING:
• Frontend sends tzOffset (client timezone offset in minutes)
• Backend receives tzOffset and generates slots in local timezone
• Backend converts slots back to UTC-equivalent times for JSON transmission
• Frontend receives "2025-12-19T03:30:00Z" (UTC) which represents local 09:00 (for IST)
• Frontend's normalizeTime() uses getHours() to get local time (09:00)
• Result: Slots displayed in user's local timezone!
      `);
      
      // Extract available slots from the response
      // Backend returns { available_slots: [...] } with times when user IS available
      // Each slot has { start: "ISO_TIMESTAMP", end: "ISO_TIMESTAMP" } format (15-minute intervals)
      let rawSlots: Array<any> = [];
      
      if (Array.isArray(availableSlotsData)) {
        rawSlots = availableSlotsData;
      } else if (availableSlotsData?.available_slots && Array.isArray(availableSlotsData.available_slots)) {
        // available_slots contains times when counselor IS available
        rawSlots = availableSlotsData.available_slots;
      } else if (availableSlotsData?.bookedSlots && Array.isArray(availableSlotsData.bookedSlots)) {
        rawSlots = availableSlotsData.bookedSlots;
      } else if (availableSlotsData?.bookings && Array.isArray(availableSlotsData.bookings)) {
        rawSlots = availableSlotsData.bookings;
      } else if (availableSlotsData?.data && Array.isArray(availableSlotsData.data)) {
        rawSlots = availableSlotsData.data;
      }
      
      console.log('[BookingSlot.fetchUnavailableSlotsForUser] Raw AVAILABLE slots extracted:', rawSlots);
      
      // Helper to get local date string (YYYY-MM-DD) from ISO timestamp
      const getLocalDateFromISO = (isoStr: string): string => {
        try {
          const dateObj = new Date(isoStr);
          if (!isNaN(dateObj.getTime())) {
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          }
        } catch (e) {
          console.warn('[getLocalDateFromISO] Failed to parse:', isoStr, e);
        }
        return '';
      };
      
      // Normalize time formats: convert ISO timestamps to "HH:MM" format in local timezone
      const normalizeTime = (timeStr: string): string => {
        if (!timeStr) return '';
        
        // If it's an ISO timestamp, extract time part in local timezone
        if (timeStr.includes('T') || timeStr.includes('Z') || timeStr.includes('+')) {
          try {
            const dateObj = new Date(timeStr);
            if (!isNaN(dateObj.getTime())) {
              // Get local time hours and minutes
              // JavaScript's Date automatically converts to local timezone
              const localHours = dateObj.getHours();
              const localMinutes = dateObj.getMinutes();
              const hours = String(localHours).padStart(2, '0');
              const minutes = String(localMinutes).padStart(2, '0');
              const normalized = `${hours}:${minutes}`;
              
              // Enhanced debug: show timezone conversion
              const userTimezoneOffset = new Date().getTimezoneOffset(); // in minutes
              const tzHours = Math.abs(userTimezoneOffset / 60);
              const tzSign = userTimezoneOffset > 0 ? '-' : '+';
              
              console.log(`[normalizeTime] ⭐ RAW: "${timeStr}" → UTC: ${dateObj.toUTCString()} → LOCAL (UTC${tzSign}${tzHours}): "${normalized}"`);
              return normalized;
            }
          } catch (e) {
            console.warn('[normalizeTime] Failed to parse ISO timestamp:', timeStr, e);
          }
        }
        
        // If it's "HH:MM:SS" or "HH:MM:SS.SSS", convert to "HH:MM"
        const timeParts = timeStr.split(':');
        if (timeParts.length >= 2) {
          const hours = timeParts[0].padStart(2, '0');
          const minutes = timeParts[1].padStart(2, '0');
          return `${hours}:${minutes}`;
        }
        
        // If it's already "HH:MM", return as is
        return timeStr;
      };
      
      // Normalize all slots - handle both "start"/"end" and "startTime"/"endTime" field names
      // IMPORTANT: Filter to only include slots on the selected date (in local timezone)
      // This ensures UTC timestamps are correctly matched to the selected local date
      const normalizedSlots = rawSlots
        .filter((slot: any) => {
          // Check if slot has time fields (either format)
          if (!slot || (!(slot.start || slot.startTime) || !(slot.end || slot.endTime))) {
            return false;
          }
          
          // Extract time values
          const startValue = slot.start || slot.startTime || slot.start_time || '';
          
          // If it's an ISO timestamp, check if the date (in local time) matches the selected date
          // This is crucial because UTC times converted to local time might fall on a different date
          if (startValue.includes('T') || startValue.includes('Z') || startValue.includes('+')) {
            const localDate = getLocalDateFromISO(startValue);
            console.log(`[fetchUnavailableSlotsForUser] Date check: slot date="${localDate}", selected date="${date}", match=${localDate === date}`);
            if (localDate && localDate !== date) {
              console.log(`[fetchUnavailableSlotsForUser] ❌ Filtering out slot from different date: ${localDate} !== ${date} (UTC timestamp: ${startValue})`);
              return false; // Filter out slots from different dates
            } else if (localDate && localDate === date) {
              console.log(`[fetchUnavailableSlotsForUser] ✅ Keeping slot from matching date: ${localDate} === ${date}`);
            }
          }
          
          return true;
        })
        .map((slot: any) => {
          // Extract time from either "start"/"end" or "startTime"/"endTime"
          const startValue = slot.start || slot.startTime || slot.start_time || '';
          const endValue = slot.end || slot.endTime || slot.end_time || '';
          
          return {
            startTime: normalizeTime(startValue),
            endTime: normalizeTime(endValue),
          };
        })
        .filter((slot: { startTime: string; endTime: string }) => slot.startTime && slot.endTime);
      
      console.log('[BookingSlot.fetchUnavailableSlotsForUser] Normalized AVAILABLE slots (local time):', normalizedSlots);
      console.log('[BookingSlot.fetchUnavailableSlotsForUser] Total AVAILABLE slots for this date:', normalizedSlots.length);
      console.log('[BookingSlot.fetchUnavailableSlotsForUser] Selected date for booking:', date);
      
      // Store AVAILABLE time ranges - user can only book within these slots
      // These represent times when the user IS available for new bookings
      console.log('[BookingSlot.fetchUnavailableSlotsForUser] ⭐ SETTING bookedTimeRanges to:', normalizedSlots.map(s => `${s.startTime}-${s.endTime}`).join(', '));
      setBookedTimeRanges(normalizedSlots);
      
      // Debug: Log the stored available ranges for troubleshooting
      console.log('[BookingSlot.fetchUnavailableSlotsForUser] Stored AVAILABLE time ranges (for enabling bookings):', normalizedSlots);
      
      // Mark matching time slots as booked/unavailable
      setTimeSlots((prevSlots) =>
        prevSlots.map((slot) => {
          // Check if this slot overlaps with any unavailable slot (use normalized slots)
          const isUnavailable = normalizedSlots.some((unavailable) => {
            const slotStart = slot.startTime;
            const slotEnd = slot.endTime;
            const unavailableStart = unavailable.startTime;
            const unavailableEnd = unavailable.endTime;
            
            // Normalize time strings (handle HH:MM format)
            const parseTime = (timeStr: string): number => {
              const [hours, minutes] = timeStr.split(':').map(Number);
              return hours * 60 + minutes;
            };
            
            const slotStartMinutes = parseTime(slotStart);
            const slotEndMinutes = parseTime(slotEnd);
            const unavailableStartMinutes = parseTime(unavailableStart);
            const unavailableEndMinutes = parseTime(unavailableEnd);
            
            // Check for overlap: slots overlap if they share any time
            return (
              (slotStartMinutes >= unavailableStartMinutes && slotStartMinutes < unavailableEndMinutes) ||
              (slotEndMinutes > unavailableStartMinutes && slotEndMinutes <= unavailableEndMinutes) ||
              (slotStartMinutes <= unavailableStartMinutes && slotEndMinutes >= unavailableEndMinutes)
            );
          });
          
          if (isUnavailable && !slot.isBooked) {
            return {
              ...slot,
              isBooked: true,
              // Keep existing bookedBy info if present
            };
          }
          
          return slot;
        })
      );
    } catch (error) {
      console.error('[BookingSlot.fetchUnavailableSlotsForUser] Error:', error);
      setBookedTimeRanges([]); // Clear on error
      // On error, don't mark any slots as unavailable (fail open - allow booking attempts)
    }
  };

  // Helper function to check if a user-selected time range is WITHIN available slots
  // Returns true (button ENABLED) if the selected time is completely within at least one available slot
  // Returns false (button DISABLED) if the selected time falls outside all available slots or only partially overlaps
  const isTimeRangeBooked = (startTime: string, endTime: string): boolean => {
    console.log(`\n[isTimeRangeBooked] ===== DEBUG START =====`);
    console.log(`[isTimeRangeBooked] Input - startTime: "${startTime}", endTime: "${endTime}"`);
    console.log(`[isTimeRangeBooked] Available slots count: ${bookedTimeRanges.length}`);
    console.log(`[isTimeRangeBooked] Available slots data:`, bookedTimeRanges);
    
    if (!startTime || !endTime) {
      console.log(`[isTimeRangeBooked] ❌ Missing times: startTime=${startTime}, endTime=${endTime}`);
      console.log(`[isTimeRangeBooked] ===== DEBUG END (MISSING TIMES) =====\n`);
      return false;
    }
    
    if (bookedTimeRanges.length === 0) {
      console.log(`[isTimeRangeBooked] ❌ No available slots loaded yet. User cannot book any time.`);
      console.log(`[isTimeRangeBooked] ===== DEBUG END (NO SLOTS) =====\n`);
      return false;
    }
    
    const parseTime = (timeStr: string): number => {
      if (!timeStr || !timeStr.includes(':')) {
        console.warn(`[parseTime] Invalid time string: "${timeStr}"`);
        return -1;
      }
      const [hours, minutes] = timeStr.split(':').map(Number);
      if (isNaN(hours) || isNaN(minutes)) {
        console.warn(`[parseTime] Failed to parse time: "${timeStr}"`);
        return -1;
      }
      return hours * 60 + minutes;
    };
    
    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    
    console.log(`[isTimeRangeBooked] Parsed user times - startMinutes: ${startMinutes}, endMinutes: ${endMinutes}`);
    
    if (startMinutes < 0 || endMinutes < 0) {
      console.log(`[isTimeRangeBooked] ❌ Failed to parse times`);
      console.log(`[isTimeRangeBooked] ===== DEBUG END (PARSE ERROR) =====\n`);
      return false;
    }
    
    console.log(`[isTimeRangeBooked] User selected: ${startTime}-${endTime} (${startMinutes}-${endMinutes} minutes)`);
    console.log(`[isTimeRangeBooked] Checking against ${bookedTimeRanges.length} available slots`);
    
    // Check if the selected time falls COMPLETELY WITHIN any available slot
    // User can select partial available slots (e.g., 09:00-09:30 within 09:00-10:00 available slot)
    for (let i = 0; i < bookedTimeRanges.length; i++) {
      const availableSlot = bookedTimeRanges[i];
      console.log(`[isTimeRangeBooked] Slot ${i}: startTime="${availableSlot.startTime}", endTime="${availableSlot.endTime}"`);
      
      if (!availableSlot.startTime || !availableSlot.endTime) {
        console.warn(`[isTimeRangeBooked] ⚠️ Invalid available slot at index ${i}:`, availableSlot);
        continue;
      }
      
      const slotStartMinutes = parseTime(availableSlot.startTime);
      const slotEndMinutes = parseTime(availableSlot.endTime);
      
      console.log(`[isTimeRangeBooked] Slot ${i} parsed - startMinutes: ${slotStartMinutes}, endMinutes: ${slotEndMinutes}`);
      
      if (slotStartMinutes < 0 || slotEndMinutes < 0) {
        console.warn(`[isTimeRangeBooked] ⚠️ Failed to parse slot times`);
        continue;
      }
      
      // Handle edge case: times crossing midnight (e.g., 23:45-00:00)
      // When a slot ends at "00:00" (midnight), treat it as 1440 minutes (end of 24-hour day)
      const normalizedUserStart = startMinutes;
      const normalizedUserEnd = endMinutes === 0 && endTime !== '00:00' ? 1440 : endMinutes;
      const normalizedSlotStart = slotStartMinutes;
      const normalizedSlotEnd = slotEndMinutes === 0 && availableSlot.endTime !== '00:00' ? 1440 : slotEndMinutes;
      
      console.log(`[isTimeRangeBooked] Slot ${i} comparison:`);
      console.log(`  User time (normalized): ${normalizedUserStart}-${normalizedUserEnd}`);
      console.log(`  Available slot (normalized): ${normalizedSlotStart}-${normalizedSlotEnd}`);
      
      // Check if user's selected time is COMPLETELY WITHIN the available slot
      // User can select partial available slot: userStart >= slotStart AND userEnd <= slotEnd
      const isWithinSlot = (normalizedUserStart >= normalizedSlotStart && normalizedUserEnd <= normalizedSlotEnd);
      
      console.log(`[isTimeRangeBooked] Check: ${normalizedUserStart} >= ${normalizedSlotStart} && ${normalizedUserEnd} <= ${normalizedSlotEnd} = ${isWithinSlot}`);
      
      if (isWithinSlot) {
        console.log(`[isTimeRangeBooked] ✅ MATCH! User can book ${startTime}-${endTime} within slot ${availableSlot.startTime}-${availableSlot.endTime}`);
        console.log(`[isTimeRangeBooked] ===== DEBUG END (SUCCESS) =====\n`);
        return true; // ENABLE THE BOOKING - button will be ENABLED
      }
    }
    
    console.log(`[isTimeRangeBooked] ❌ NO MATCH! User-selected time ${startTime}-${endTime} is outside all available slots`);
    console.log(`[isTimeRangeBooked] ===== DEBUG END (NO MATCH) =====\n`);
    return false; // DISABLE THE BOOKING - button will be DISABLED
  };

  // Initialize time slots when date, start time, or end time changes
  useEffect(() => {
    if (selectedDate) {
      const slots = generateTimeSlots(selectedDate, startTime, endTime);
      setTimeSlots(slots);
      
      // If user is already selected, fetch unavailable slots
      if (isEditMode && selectedUser) {
        fetchUnavailableSlotsForUser(selectedUser, selectedDate);
      }
    }
  }, [selectedDate, startTime, endTime]);

  // Fetch unavailable slots when user and date are selected (in edit mode)
  useEffect(() => {
    if (isEditMode && selectedUser && selectedDate) {
      fetchUnavailableSlotsForUser(selectedUser, selectedDate);
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

    try {
      setLoading(true);
      const user = users.find((c) => String(c.id) === selectedUser);

      // Check availability before booking
      try {
        const availabilityResult = await bookingService.checkAvailability({
          userId: selectedUser,
          date: selectedDate,
          startTime: selectedSlotForBooking.startTime,
          endTime: selectedSlotForBooking.endTime,
        });

        if (!availabilityResult.available) {
          showToast(availabilityResult.message || 'Slot is no longer available. Please select another time.', 'warning');
          // Refresh booked slots to update UI
          await fetchBookedSlots(isEditMode ? selectedDate : undefined);
          setLoading(false);
          return;
        }
      } catch (availabilityError: any) {
        // If availability check fails, log but continue with booking attempt
        // The backend booking API should also validate availability
        console.warn('[BookingSlot.handleConfirmBooking] Availability check failed, proceeding with booking:', availabilityError);
      }

      // Use bookingService to book the slot
      const bookingData: bookingService.BookingParams = {
        leadId: leadId,
        userId: selectedUser,
        date: selectedDate,
        startTime: selectedSlotForBooking.startTime,
        endTime: selectedSlotForBooking.endTime,
      };

      console.log('[BookingSlot.handleConfirmBooking] Booking with data:', bookingData);
      await bookingService.bookSlot(bookingData);

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
        await fetchUnavailableSlotsForUser(selectedUser, selectedDate);
      }
      
      setConfirmDialogOpen(false);
      setSelectedSlotForBooking(null);
      
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
        
        // Also refresh unavailable slots
        if (selectedUser) {
          await fetchUnavailableSlotsForUser(selectedUser, selectedDate);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (slotId: string) => {
    try {
      setLoading(true);
      
      console.log('[BookingSlot.handleCancelBooking] Cancelling booking:', slotId);
      
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
        await fetchUnavailableSlotsForUser(selectedUser, selectedDate);
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
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // If in edit mode, show appointment details view
  if (isEditMode) {
    return (
      <div className="space-y-4">
        {/* Booked Appointments List - Enhanced View in Edit Mode */}
        {bookedSlots.length > 0 ? (
          <div>
            <Label className="text-sm text-gray-600 mb-3 block font-medium">
              Booked Appointments ({bookedSlots.length})
            </Label>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bookedSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="p-4 bg-white border border-green-200 rounded-lg hover:border-green-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                          <div>
                            <div className="text-sm font-semibold text-gray-900">
                              {formatDate(slot.date)}
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
            {users.length > 0 && (
              <div>
                <Label htmlFor="user-select-edit" className="text-sm text-gray-600 mb-2 block">
                  Select User
                </Label>
                <Select
                  value={selectedUser}
                  onValueChange={(value: string) => setSelectedUser(value)}
                >
                  <SelectTrigger id="user-select-edit" className="w-full">
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={String(user.id)}>
                        {user.name} {user.email ? `(${user.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

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
                    // Auto-adjust end time if needed
                    const [startHour, startMin] = newStartTime.split(':').map(Number);
                    const startTotalMin = startHour * 60 + startMin;
                    const [endHour, endMin] = endTime.split(':').map(Number);
                    const endTotalMin = endHour * 60 + endMin;
                    
                    // If end time is before or equal to new start time, set end time to 15 min after start
                    if (endTotalMin <= startTotalMin) {
                      const newEndTotalMin = startTotalMin + 15;
                      const newEndHour = Math.floor(newEndTotalMin / 60) % 24;
                      const newEndMin = newEndTotalMin % 60;
                      setEndTime(`${newEndHour.toString().padStart(2, '0')}:${newEndMin.toString().padStart(2, '0')}`);
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {/* Generate time slots in 15-minute intervals from 09:00 to 18:00 (9 AM to 6 PM) */}
                  {Array.from({ length: 37 }, (_, i) => {
                    const totalMinutes = 9 * 60 + i * 15; // Start from 09:00
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    return (
                      <option key={timeStr} value={timeStr}>
                        {timeStr}
                      </option>
                    );
                  })}
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
                >
                  {/* Generate time slots in 15-minute intervals from 09:00 to 18:00 (9 AM to 6 PM) */}
                  {Array.from({ length: 37 }, (_, i) => {
                    const totalMinutes = 9 * 60 + i * 15; // Start from 09:00
                    const hours = Math.floor(totalMinutes / 60);
                    const minutes = totalMinutes % 60;
                    const timeStr = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                    return (
                      <option key={timeStr} value={timeStr}>
                        {timeStr}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Book Slot Button */}
            {startTime && endTime && endTime > startTime && selectedUser && (
              <Button
                onClick={() => {
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
                disabled={loading || !isTimeRangeBooked(startTime, endTime)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                {!isTimeRangeBooked(startTime, endTime) ? (
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
                disabled={loading}
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
  return (
    <>
      <div className="flex flex-col gap-3">
        {bookedSlots.length > 0 ? (
          bookedSlots.map((slot) => (
            <div key={slot.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-gray-900 font-medium">{formatDate(slot.date)}</span>
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
      </div>
    </>
  );
};

export default BookingSlot;

