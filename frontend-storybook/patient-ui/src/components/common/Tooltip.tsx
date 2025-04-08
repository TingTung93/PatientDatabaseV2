import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'top',
  delay = 200,
  className = '',
}): JSX.Element => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout>();

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 -translate-y-2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 translate-x-2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 translate-y-2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 -translate-x-2 mr-2',
  };

  const handleMouseEnter = (): void => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  };

  const handleMouseLeave = (): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    setIsVisible(false);
  };

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      {isVisible && (
        <div
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-sm text-white ${positionClasses[position]} ${className}`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
};
