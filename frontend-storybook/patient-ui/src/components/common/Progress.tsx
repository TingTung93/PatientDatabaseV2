import React from 'react';
import classNames from 'classnames';

export type ProgressColor = 'blue' | 'green' | 'red' | 'yellow';
export type ProgressSize = 'sm' | 'md' | 'lg';

export interface ProgressProps {
  value: number;
  color?: ProgressColor;
  size?: ProgressSize;
  className?: string;
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  color = 'blue',
  size = 'md',
  className
}) => {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    red: 'bg-red-600',
    yellow: 'bg-yellow-600'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const clampedValue = Math.min(Math.max(value, 0), 100);

  return (
    <div className={classNames('w-full bg-gray-200 rounded-full', sizeClasses[size], className)}>
      <div
        className={classNames('rounded-full transition-all duration-300', colorClasses[color])}
        style={{ width: `${clampedValue}%` }}
      />
    </div>
  );
}; 