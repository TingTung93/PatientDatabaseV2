import React from 'react';
import classNames from 'classnames';
import { Tooltip } from './Tooltip';

export type TagColor = 'green' | 'yellow' | 'red' | 'blue' | 'gray';

export interface TagProps {
  children: React.ReactNode;
  color?: TagColor;
  className?: string;
  tooltip?: React.ReactNode;
  onClick?: () => void;
}

export const Tag: React.FC<TagProps> = ({
  children,
  color = 'gray',
  className,
  tooltip,
  onClick,
}): JSX.Element => {
  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  const tag = (
    <span
      className={classNames(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        colorClasses[color],
        className,
        onClick ? 'cursor-pointer' : ''
      )}
      onClick={onClick}
    >
      {children}
    </span>
  );

  if (tooltip) {
    return <Tooltip content={tooltip}>{tag}</Tooltip>;
  }

  return tag;
};
