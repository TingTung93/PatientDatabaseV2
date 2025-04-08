import React from 'react';

interface CautionCardUploadProps {
  onUpload?: (file: File) => Promise<{
    success: boolean;
    message: string;
    cardId?: number;
  }>;
  isLoading?: boolean;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
}

export const CautionCardUpload: React.FC<CautionCardUploadProps> = ({
  onUpload,
  isLoading = false,
  maxFileSize = 5 * 1024 * 1024, // 5MB default
  acceptedFileTypes = ['.pdf', '.jpg', '.jpeg', '.png'],
}) => {
  // This is a placeholder component implementation
  // The actual implementation would include:
  // - File upload UI
  // - File validation
  // - Upload progress
  // - Error handling

  return (
    <div className="caution-card-upload">
      <h2>Upload Caution Card</h2>
      {isLoading ? (
        <div>Uploading...</div>
      ) : (
        <div className="upload-form">
          <input
            type="file"
            accept={acceptedFileTypes.join(',')}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && onUpload) {
                if (file.size > maxFileSize) {
                  alert('File size exceeds maximum allowed size');
                  return;
                }
                onUpload(file);
              }
            }}
          />
          <p className="help-text">
            Accepted file types: {acceptedFileTypes.join(', ')}
            <br />
            Maximum file size: {Math.floor(maxFileSize / 1024 / 1024)}MB
          </p>
        </div>
      )}
    </div>
  );
}; 