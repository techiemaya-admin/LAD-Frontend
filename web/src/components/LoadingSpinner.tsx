'use client';

import SearchSpinner from './SearchSpinner';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
  fullScreen?: boolean;
  inline?: boolean; // For button spinners
}

export const LoadingSpinner = ({ 
  size = 'md', 
  message = 'Loading...', 
  fullScreen = false,
  inline = false
}: LoadingSpinnerProps) => {
  // Inline mode for buttons (horizontal layout, no padding)
  if (inline) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-block scale-75">
          <SearchSpinner size="sm" />
        </span>
        {message && <span className="text-sm">{message}</span>}
      </span>
    );
  }

  // Full-screen or section loading
  const containerClasses = fullScreen
    ? 'flex flex-col items-center justify-center min-h-screen'
    : 'flex flex-col items-center justify-center p-8';

  return (
    <div className={containerClasses}>
      <SearchSpinner size={size} message={message} />
    </div>
  );
};

export default LoadingSpinner;
