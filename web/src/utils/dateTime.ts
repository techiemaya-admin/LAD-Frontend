// Utility functions for date and time formatting
interface UserSettings {
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12' | '24';
  [key: string]: unknown;
}

/**
 * Unified date formatter - shows date as "Feb 19, 2026" format
 * Use this everywhere in the app for consistent date display
 * @param dateString - date string, Date object, number (timestamp), or null/undefined
 * @returns formatted date string like "Feb 19, 2026" or fallback text
 */
export function formatDate(dateString?: string | Date | number | null): string {
  if (!dateString) return 'No date set';
  
  try {
    let date: Date;
    
    // If it's already a Date object
    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'string') {
      // Handle empty strings, 'null', 'undefined' strings
      if (dateString.trim() === '' || dateString === 'null' || dateString === 'undefined') {
        return 'No date set';
      }
      date = new Date(dateString);
    } else if (typeof dateString === 'number') {
      // Handle Unix timestamps (both seconds and milliseconds)
      date = new Date(dateString < 10000000000 ? dateString * 1000 : dateString);
    } else {
      return 'Invalid date';
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) return 'Invalid date';
    
    // Check for unrealistic dates (before 1900 or too far in future)
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return 'Invalid date';
    
    // Unified format: "Feb 19, 2026"
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return 'Invalid date';
  }
}

/**
 * Format date with time - shows as "Feb 19, 2026, 3:35 PM" format
 * Use this when you need date + time display
 * @param dateString - date string, Date object, number (timestamp), or null/undefined
 * @param showSeconds - whether to include seconds (default: false)
 * @returns formatted datetime string
 */
export function formatDateTimeUnified(
  dateString?: string | Date | number | null,
  showSeconds = false
): string {
  if (!dateString) return 'No date set';
  
  try {
    let date: Date;
    
    if (dateString instanceof Date) {
      date = dateString;
    } else if (typeof dateString === 'string') {
      if (dateString.trim() === '' || dateString === 'null' || dateString === 'undefined') {
        return 'No date set';
      }
      date = new Date(dateString);
    } else if (typeof dateString === 'number') {
      date = new Date(dateString < 10000000000 ? dateString * 1000 : dateString);
    } else {
      return 'Invalid date';
    }
    
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return 'Invalid date';
    
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    if (showSeconds) {
      options.second = '2-digit';
    }
    
    return date.toLocaleString('en-US', options);
  } catch (error) {
    return 'Invalid date';
  }
}

// Format a UTC string to a localized date/time string based on user settings
// userSettings: { timezone, dateFormat, timeFormat }
export function formatDateTime(utcString: string | null | undefined, userSettings?: UserSettings): string {
  if (!utcString) return '';
  const {
    timezone = 'UTC',
    timeFormat = '24',
  } = userSettings || {};
  const date = new Date(utcString);
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12',
  };
  return date.toLocaleString(undefined, options);
}

// Get the month and year (e.g., "JANUARY 2024") from a date string
export function getMonthYear(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', { month: 'long', year: 'numeric' }).toUpperCase();
}
