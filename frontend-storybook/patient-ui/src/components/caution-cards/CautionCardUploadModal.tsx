import React, { useState } from 'react';
import { useProcessCautionCard } from '../../hooks/useCautionCards'; // Correct path

interface CautionCardUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CautionCardUploadModal: React.FC<CautionCardUploadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const processMutation = useProcessCautionCard();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0]);
    } else {
      setFile(null);
    }
  };

  const handleUpload = () => {
    if (file) {
      processMutation.mutate(
        { file },
        {
          onSuccess: () => {
            console.log('Caution card uploaded for processing.');
            setFile(null); // Reset file input on success
            onClose();
            // TODO: Show success notification
          },
          onError: (error: Error) => {
            console.error('Caution card upload failed:', error);
            // Error message is displayed below based on mutation.isError
            // TODO: Show error notification
          },
        }
      );
    }
  };

  // Reset file state when modal is closed externally
  React.useEffect(() => {
    if (!isOpen) {
      setFile(null);
      processMutation.reset(); // Reset mutation state if needed
    }
  }, [isOpen, processMutation]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-lg w-full p-6"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center pb-3 border-b">
          <h3 className="text-xl font-semibold">Upload Caution Card</h3>
          <button onClick={onClose} className="text-black opacity-50 hover:opacity-100 text-2xl">
            ×
          </button>
        </div>

        {/* Body */}
        <div className="py-4 space-y-4">
          <p className="text-sm text-gray-600">
            Select a Caution Card image or PDF file. The system will attempt to extract information
            automatically using OCR.
          </p>
          <div>
            <label htmlFor="cautionCardFile" className="block text-sm font-medium text-gray-700">
              Card File
            </label>
            <input
              id="cautionCardFile"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.tiff,.tif" // Specify acceptable file types
              onChange={handleFileSelect}
              className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </p>
            )}
          </div>

          {/* Error Display */}
          {processMutation.isError && (
            <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-400 rounded">
              Error: {(processMutation.error as Error)?.message || 'Upload failed'}
            </div>
          )}
        </div>

        {/* Footer / Actions */}
        <div className="flex items-center justify-end pt-4 border-t">
          <button
            onClick={onClose}
            className="text-gray-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            disabled={processMutation.isPending} // Use isPending for v5
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            className="bg-indigo-600 text-white active:bg-indigo-700 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150 disabled:opacity-50"
            disabled={!file || processMutation.isPending} // Use isPending for v5
          >
            {processMutation.isPending ? 'Uploading...' : 'Upload'} // Use isPending for v5
          </button>
        </div>
      </div>
    </div>
  );
};

export default CautionCardUploadModal;
