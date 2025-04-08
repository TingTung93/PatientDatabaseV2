import React from 'react';
import classNames from 'classnames';

export interface TabItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TabsProps {
  value: string;
  onChange: (value: string) => void;
  items: TabItem[];
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  value,
  onChange,
  items,
  className
}) => {
  return (
    <div className={classNames('border-b border-gray-200', className)}>
      <nav className="-mb-px flex space-x-8" aria-label="Tabs">
        {items.map((item) => {
          const isSelected = item.value === value;
          return (
            <button
              key={item.value}
              onClick={() => !item.disabled && onChange(item.value)}
              disabled={item.disabled}
              className={classNames(
                isSelected
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700',
                'whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium',
                item.disabled && 'cursor-not-allowed opacity-50'
              )}
              aria-current={isSelected ? 'page' : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}; 