import React from 'react';

export interface SelectOption {
  value: string | number;
  label: string;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options?: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
  error?: string;
  label?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  options,
  size = 'md',
  error,
  label,
  value,
  onValueChange,
  className = '',
  children,
  ...props
}) => {
  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-3 text-lg'
  };

  const baseClasses = 'block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500';
  const errorClasses = error ? 'border-red-500 text-red-600 focus:border-red-500 focus:ring-red-500' : '';

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onValueChange) {
      onValueChange(e.target.value);
    }
    if (props.onChange) {
      props.onChange(e);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        value={value}
        onChange={handleChange}
        className={`${baseClasses} ${sizeClasses[size]} ${errorClasses}`}
        {...props}
      >
        {options
          ? options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))
          : children}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}; 