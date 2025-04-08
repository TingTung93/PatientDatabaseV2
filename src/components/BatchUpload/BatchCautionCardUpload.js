import React, { useState, useCallback } from 'react';

const BatchCautionCardUpload = () => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (event) => {
    setUploadStatus(''); // Clear previous status messages
    const files = Array.from(event.target.files);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/tiff'];
    const maxFileSize = 10 * 1024 * 1024; // 10 MB limit per file
    let errorMessages = [];
    let validFiles = [];

    files.forEach(file => {
      let isValid = true;
      if (!allowedTypes.includes(file.type)) {
        errorMessages.push(`${file.name}: Unsupported type (${file.type}). Only JPG, PNG, TIF allowed.`);
        isValid = false;
      }
      if (file.size > maxFileSize) {
        errorMessages.push(`${file.name}: Exceeds size limit (${Math.round(file.size / 1024 / 1024)} MB > 10 MB).`);
        isValid = false;
      }

      if (isValid) {
        validFiles.push(file);
      }
    });

    if (errorMessages.length > 0) {
      // Combine error messages, potentially truncating if too many
      const displayErrors = errorMessages.slice(0, 3).join(' '); // Show first 3 errors
      const moreErrors = errorMessages.length > 3 ? ` (and ${errorMessages.length - 3} more errors)` : '';
      setUploadStatus(`Error: ${displayErrors}${moreErrors}. Please remove invalid files.`);
      // Keep only valid files for potential upload, or clear all if strict validation is desired
      // setSelectedFiles(validFiles); // Option 1: Allow uploading only valid files
      setSelectedFiles([]); // Option 2: Reject the whole batch if any file is invalid
      // Reset file input if rejecting the whole batch
      const fileInput = document.getElementById('batch-caution-card-input');
      if (fileInput) fileInput.value = '';
    } else {
      setSelectedFiles(validFiles); // All selected files are valid
    }
  };

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) {
      setUploadStatus('Please select files to upload.');
      return;
    }

    setIsUploading(true);
    setUploadStatus('Uploading...');

    const formData = new FormData();
    selectedFiles.forEach((file) => {
      formData.append('files', file); // 'files' should match the backend expected key
    });

    try {
      const response = await fetch('/api/ocr/batch-process', {
        method: 'POST',
        body: formData,
        // Headers might be needed depending on backend (e.g., Authorization)
        // 'Content-Type' is automatically set by browser for FormData
      });

      if (response.status === 202) {
        setUploadStatus('Upload successful, processing started.');
        setSelectedFiles([]); // Clear file list on success
        // Reset the file input visually (optional but good UX)
        const fileInput = document.getElementById('batch-caution-card-input');
        if (fileInput) {
            fileInput.value = '';
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred.' })); // Try to parse error, provide fallback
        setUploadStatus(`Upload failed: ${response.status} ${response.statusText}. ${errorData.message || ''}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Upload failed: Network error or server unavailable. ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  }, [selectedFiles]);

  return (
    <div style={{ border: '1px solid #ccc', padding: '20px', margin: '20px 0', borderRadius: '5px' }}>
      <h3>Batch Caution Card Upload</h3>
      <input
        id="batch-caution-card-input"
        type="file"
        multiple
        accept=".jpg,.jpeg,.png,.tif,.tiff"
        onChange={handleFileChange}
        disabled={isUploading}
        style={{ display: 'block', marginBottom: '10px' }}
      />

      {selectedFiles.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <h4>Selected Files:</h4>
          <ul style={{ listStyle: 'none', paddingLeft: 0, maxHeight: '150px', overflowY: 'auto', border: '1px dashed #eee', padding: '5px' }}>
            {selectedFiles.map((file, index) => (
              <li key={index} style={{ fontSize: '0.9em', marginBottom: '3px' }}>
                {file.name} ({Math.round(file.size / 1024)} KB)
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={isUploading || selectedFiles.length === 0}
        style={{ padding: '10px 15px', cursor: 'pointer' }}
      >
        {isUploading ? 'Uploading...' : 'Upload Selected Files'}
      </button>

      {uploadStatus && (
        <p style={{ marginTop: '15px', color: uploadStatus.startsWith('Error') || uploadStatus.startsWith('Upload failed') ? 'red' : 'green' }}>
          {uploadStatus}
        </p>
      )}
    </div>
  );
};

export default BatchCautionCardUpload;