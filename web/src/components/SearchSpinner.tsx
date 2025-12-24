'use client';

interface SearchSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  message?: string;
}

const SearchSpinner = ({ size = 'md', message }: SearchSpinnerProps) => {
  const sizeMap = {
    sm: 42,
    md: 84,
    lg: 126,
  };

  const spinnerSize = sizeMap[size];

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div 
        className="loader"
        style={{
          width: `${spinnerSize}px`,
          height: `${spinnerSize}px`,
          borderRadius: '50%',
          position: 'relative',
          background: `conic-gradient(
            from 0deg,
            rgba(228,213,246,1) 0deg,
            rgba(228,213,246,0.95) 30deg,
            rgba(228,213,246,0.6) 60deg,
            rgba(228,213,246,0.18) 120deg,
            rgba(228,213,246,0.06) 180deg,
            transparent 220deg
          )`,
          animation: 'spin 1.15s linear infinite',
          filter: 'drop-shadow(0 6px 18px rgba(228,213,246,0.25)) drop-shadow(0 0 10px rgba(228,213,246,0.22))',
          display: 'inline-block',
        }}
      >
        <div
          style={{
            content: '""',
            position: 'absolute',
            inset: '12%',
            borderRadius: '50%',
            background: 'var(--background, #ffffff)',
            boxShadow: 'inset 0 0 8px rgba(0,0,0,0.45)',
          }}
          className="dark:bg-gray-900"
        />
      </div>
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {message}
        </p>
      )}
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SearchSpinner;
