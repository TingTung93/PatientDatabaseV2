import React from 'react';

export interface CardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  className?: string;
  headerActions?: React.ReactNode;
  footerActions?: React.ReactNode;
  footer?: React.ReactNode;
  hoverable?: boolean;
  bordered?: boolean;
  padding?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  headerActions,
  footerActions,
  footer,
  hoverable = false,
  bordered = true,
  padding = 'medium',
  onClick,
}): JSX.Element => {
  const cardClasses = `
    bg-white shadow rounded-lg 
    ${onClick || hoverable ? 'cursor-pointer hover:shadow-lg transition-shadow duration-200' : ''} 
    ${bordered ? 'border border-gray-200' : ''} 
    ${className}
  `;

  const paddingClasses = {
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6',
  };

  return (
    <div className={cardClasses} onClick={onClick}>
      {(title || subtitle || headerActions) && (
        <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              {title && <h3 className="text-lg leading-6 font-medium text-gray-900">{title}</h3>}
              {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
            </div>
            {headerActions && <div>{headerActions}</div>}
          </div>
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
      {(footerActions || footer) && (
        <div className="px-4 py-4 sm:px-6 border-t border-gray-200">
          {footer || (footerActions && <div className="flex justify-end">{footerActions}</div>)}
        </div>
      )}
    </div>
  );
};
