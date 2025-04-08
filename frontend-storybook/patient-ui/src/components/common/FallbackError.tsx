import React from 'react';
import { FallbackProps } from 'react-error-boundary'; // Import FallbackProps

// Use FallbackProps directly
export const FallbackError: React.FC<FallbackProps> = ({
  error,
  resetErrorBoundary,
}): JSX.Element => {
  // Note: resetErrorBoundary is provided by react-error-boundary, not resetError
  return (
    <div className="p-6 m-4 bg-white rounded-lg shadow-lg">
      <div className="flex flex-col items-center space-y-4">
        {/* Error Icon */}
        <div className="text-red-500">
          <svg
            className="w-12 h-12"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h2 className="text-xl font-semibold text-gray-800">Something went wrong</h2>
        <p className="text-gray-600 text-center max-w-md">
          An unexpected error occurred. Please try again or contact support if the problem persists.
        </p>

        {/* Error Details (Development Only) */}
        {process.env.NODE_ENV === 'development' && error && (
          <div className="w-full max-w-2xl mt-4">
            <div className="bg-gray-100 rounded p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {error.toString()}
                {error.stack && `\n\n${error.stack}`}
              </pre>
            </div>
          </div>
        )}

        {/* Reset Button */}
        <button
          onClick={resetErrorBoundary} // Use resetErrorBoundary
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          Try Again
        </button>
      </div>
    </div>
  );
};
