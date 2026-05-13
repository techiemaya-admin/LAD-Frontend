import { memo } from 'react';
import { format, isToday, isYesterday } from 'date-fns';

interface DateSeparatorProps {
  date: Date;
}

export const DateSeparator = memo(function DateSeparator({ date }: DateSeparatorProps) {
  let label: string;

  if (isToday(date)) {
    label = 'Today';
  } else if (isYesterday(date)) {
    label = 'Yesterday';
  } else {
    label = format(date, 'MMMM d, yyyy');
  }

  return (
    <div className="flex items-center justify-center my-3">
      <div
        className="px-3 py-1 rounded-full shadow-sm"
        style={{
          backgroundColor: '#d9d0c7',
          color: '#4a4035',
          fontSize: '12px',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          fontWeight: 500,
          letterSpacing: '0.01em',
          lineHeight: '1.4',
        }}
      >
        {label}
      </div>
    </div>
  );
});
