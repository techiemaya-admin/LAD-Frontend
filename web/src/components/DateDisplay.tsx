import React from 'react';
import { formatDate, formatDateTimeUnified } from '@/utils/dateTime';

interface DateDisplayProps {
  date?: string | Date | number | null;
  showTime?: boolean;
  showSeconds?: boolean;
  className?: string;
  fallback?: string;
}

/**
 * Unified Date Display Component
 * Shows date in consistent "Feb 19, 2026" format across the app
 * 
 * Usage:
 * <DateDisplay date={createdAt} /> - shows "Feb 19, 2026"
 * <DateDisplay date={createdAt} showTime /> - shows "Feb 19, 2026, 3:35 PM"
 * <DateDisplay date={createdAt} showTime showSeconds /> - shows "Feb 19, 2026, 3:35:49 PM"
 */
export const DateDisplay: React.FC<DateDisplayProps> = ({
  date,
  showTime = false,
  showSeconds = false,
  className = '',
  fallback = 'No date set'
}) => {
  const formattedDate = showTime
    ? formatDateTimeUnified(date, showSeconds)
    : formatDate(date);

  return (
    <span className={className}>
      {formattedDate}
    </span>
  );
};

export default DateDisplay;
