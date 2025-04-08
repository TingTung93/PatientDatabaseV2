import React from 'react';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isConfirming?: boolean; // To show loading state on confirm button
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isConfirming = false,
  onConfirm,
  onCancel,
}): JSX.Element | null => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto outline-none focus:outline-none"
      onClick={onCancel} // Close on backdrop click
    >
      <div
        className="relative w-auto max-w-lg mx-auto my-6"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Modal Content */}
        <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
          {/* Header */}
          <div className="flex items-start justify-between p-5 border-b border-solid border-gray-300 rounded-t">
            <h3 className="text-xl font-semibold">{title}</h3>
            <button
              className="p-1 ml-auto bg-transparent border-0 text-black opacity-50 float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
              onClick={onCancel}
            >
              <span className="bg-transparent text-black h-6 w-6 text-2xl block outline-none focus:outline-none">
                ×
              </span>
            </button>
          </div>
          {/* Body */}
          <div className="relative p-6 flex-auto">
            <p className="my-4 text-gray-600 text-lg leading-relaxed">{message}</p>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-end p-6 border-t border-solid border-gray-300 rounded-b">
            <button
              className="text-gray-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
              type="button"
              onClick={onCancel}
              disabled={isConfirming}
            >
              {cancelText}
            </button>
            <button
              // Example using red for destructive action
              className="bg-red-500 text-white active:bg-red-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 disabled:opacity-50"
              type="button"
              onClick={onConfirm}
              disabled={isConfirming}
            >
              {isConfirming ? 'Confirming...' : confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
