// Utility functions for date and time formatting
interface UserSettings {
  timezone?: string;
  dateFormat?: string;
  timeFormat?: '12' | '24';
  [key: string]: unknown;
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