import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      className = '',
      fullWidth = false,
      disabled,
      ...rest
    },
    ref
  ) => {
    const hasError = !!error;
    const inputBaseClasses = 'block px-4 py-2 rounded-md border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
    const inputStateClasses = hasError
      ? 'border-red-300 text-red-600 placeholder-red-400 focus:ring-red-500 focus:border-red-500'
      : disabled
      ? 'border-gray-200 bg-gray-100 text-gray-500 placeholder-gray-400 cursor-not-allowed'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500';
    const inputWidthClasses = fullWidth ? 'w-full' : '';

    return (
      <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            className={`${inputBaseClasses} ${inputStateClasses} ${inputWidthClasses} ${
              leftIcon ? 'pl-10' : ''
            } ${rightIcon ? 'pr-10' : ''}`}
            disabled={disabled}
            aria-invalid={hasError}
            {...rest}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {rightIcon}
            </div>
          )}
        </div>
        {(error || hint) && (
          <p
            className={`mt-1 text-sm ${
              hasError ? 'text-red-600' : 'text-gray-500'
            }`}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input'; 