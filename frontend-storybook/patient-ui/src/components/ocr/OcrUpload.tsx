import React, { useCallback, useState, useEffect } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { Button, Progress } from '../common';
import { useOcr } from '../../hooks/useOcr';

export interface OcrUploadProps {
  className?: string;
}

export const OcrUpload: React.FC<OcrUploadProps> = ({ className }) => {
  const { useUploadFile } = useOcr();
  const uploadMutation = useUploadFile();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dropzoneError, setDropzoneError] = useState<string | null>(null);

  useEffect(() => {
    if (uploadMutation.isIdle || uploadMutation.isSuccess) {
      setSelectedFile(null);
      setUploadProgress(0);
      setDropzoneError(null);
    }
    if (uploadMutation.isSuccess) {
      setUploadProgress(100);
    }
  }, [uploadMutation.isIdle, uploadMutation.isSuccess]);

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      setDropzoneError(null);
      uploadMutation.reset();
      setSelectedFile(null);
      setUploadProgress(0);

      if (fileRejections.length > 0) {
        // Use type assertion as workaround for potential type issue
        setDropzoneError((fileRejections[0] as any).errors[0].message || 'Invalid file selected.');
        return;
      }

      const file = acceptedFiles[0];
      if (!file) return;

      setSelectedFile(file);

      uploadMutation.mutate(
        { file, onProgress: setUploadProgress }, // Revert: Pass object with file and onProgress
        {
          onError: () => {
            setUploadProgress(0);
          },
        }
      );
    },
    [uploadMutation]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  });

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedFile(null);
    setUploadProgress(0);
    uploadMutation.reset();
    setDropzoneError(null);
  };

  const status = uploadMutation.isPending
    ? 'uploading'
    : uploadMutation.isError
      ? 'error'
      : uploadMutation.isSuccess
        ? 'success'
        : 'idle';

  const errorMessage =
    dropzoneError ||
    (uploadMutation.isError ? (uploadMutation.error as Error)?.message || 'Upload failed' : null);

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center transition-colors duration-200 ease-in-out
          ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}
          ${selectedFile || dropzoneError ? 'cursor-default' : 'cursor-pointer'}
          ${status === 'error' || dropzoneError ? 'border-red-500 bg-red-50' : ''}
          ${status === 'success' ? 'border-green-500 bg-green-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        {selectedFile ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 truncate pr-2">{selectedFile.name}</span>
              <Button
                variant="text"
                size="sm"
                color={status === 'error' ? 'red' : 'default'}
                onClick={removeFile}
                disabled={status === 'uploading'}
              >
                {status === 'uploading' ? 'Cancel' : 'Remove'}
              </Button>
            </div>
            {(status === 'uploading' || status === 'success') && (
              <Progress
                value={uploadProgress}
                color={status === 'success' ? 'green' : 'blue'}
                size="sm"
              />
            )}
            {errorMessage && <p className="text-sm text-red-600 text-left mt-1">{errorMessage}</p>}
            {status === 'success' && (
              <p className="text-sm text-green-600 text-left mt-1">Upload successful!</p>
            )}
          </div>
        ) : (
          <div>
            {errorMessage ? (
              <p className="text-sm text-red-600 mb-2">{errorMessage}</p>
            ) : (
              <p className="text-gray-600">
                {isDragActive ? (
                  'Drop the file here...'
                ) : (
                  <>
                    Drag and drop document file here, or{' '}
                    <span className="text-indigo-600 font-medium">click to select</span>
                  </>
                )}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              Supported formats: PDF, JPG, PNG (Max size handled by server)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
