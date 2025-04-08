import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'medium',
  message = 'Loading...',
  className = '',
}): JSX.Element => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
  };

  return (
    <div
      className={`loading-spinner flex flex-col items-center justify-center ${className}`}
      role="status"
    >
      <div
        className={`animate-spin rounded-full border-4 border-gray-200 border-t-blue-500 ${sizeClasses[size]}`}
      />
      {message && <span className="mt-2 text-gray-600">{message}</span>}
      <span className="sr-only">Loading</span>
    </div>
  );
};
