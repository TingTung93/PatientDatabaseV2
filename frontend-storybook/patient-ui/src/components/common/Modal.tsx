import React from 'react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={onClose} />
        <div className={`relative w-full ${sizeClasses[size]} transform rounded-lg bg-white p-6 shadow-xl transition-all`}>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-medium">{title}</h3>
            <Button
              variant="text"
              size="sm"
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
          <div className="mb-6">{children}</div>
          {footer && <div className="flex justify-end gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  );
}; 